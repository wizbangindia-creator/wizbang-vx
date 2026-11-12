import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  ArrowRight,
  User,
  Mail,
  Phone,
  Sparkles,
  X,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // Sun..Sat
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtMonth(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDisplayDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function fmt12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function UCBookingCalendar({
  // When true and `prefill` is provided, the component renders as a modal overlay
  // and skips the inline contact form (uses prefill data directly when booking).
  asModal = false,
  isOpen = true,
  onClose,
  prefill = null,
  onBooked,
}) {
  const todayLocal = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(() => new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1));
  const [availableDays, setAvailableDays] = useState(new Set());
  const [loadingDays, setLoadingDays] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedTime, setSelectedTime] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const hasPrefill = !!prefill;

  const modeHeading = (() => {
    const mode = prefill?.consultation_mode;
    if (mode === "in_person") {
      return "When would you like to visit our office?";
    }
    if (mode === "telephonic") {
      return "When would you like to be called?";
    }
    if (mode === "online") {
      return "When would you like to meet online?";
    }
    return null;
  })();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    current_university: "",
    transfer_type: "",
    notes: "",
  });

  // Reset internal state whenever the modal is re-opened
  useEffect(() => {
    if (asModal && isOpen) {
      const reset = () => {
        setSelectedDate(null);
        setSelectedTime(null);
        setShowForm(false);
        setConfirmation(null);
        setViewMonth(new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1));
      };
      reset();
    }
  }, [asModal, isOpen, todayLocal]);

  // Fetch bookable days for the visible month
  useEffect(() => {
    if (asModal && !isOpen) return;
    let alive = true;
    const fetchDays = async () => {
      setLoadingDays(true);
      try {
        const res = await axios.get(`${API}/api/uc-bookings/days`, {
          params: { month: fmtMonth(viewMonth) },
        });
        if (alive) setAvailableDays(new Set(res.data?.days || []));
      } catch (e) {
        if (alive) {
          console.error("days fetch failed", e);
          setAvailableDays(new Set());
        }
      } finally {
        if (alive) setLoadingDays(false);
      }
    };
    fetchDays();
    return () => {
      alive = false;
    };
  }, [viewMonth, asModal, isOpen]);

  // Fetch slots when a date is picked
  useEffect(() => {
    let alive = true;
    const fetchSlots = async () => {
      if (!selectedDate) {
        if (alive) setSlots([]);
        return;
      }
      setLoadingSlots(true);
      setSelectedTime(null);
      setShowForm(false);
      try {
        const res = await axios.get(`${API}/api/uc-bookings/availability`, {
          params: { date: selectedDate },
        });
        if (alive) setSlots(res.data?.slots || []);
      } catch (e) {
        if (alive) {
          console.error("slots fetch failed", e);
          setSlots([]);
        }
      } finally {
        if (alive) setLoadingSlots(false);
      }
    };
    fetchSlots();
    return () => {
      alive = false;
    };
  }, [selectedDate]);

  const calendarCells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    return cells;
  }, [viewMonth]);

  const isPrevDisabled = useMemo(() => {
    const firstOfThis = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1);
    return viewMonth <= firstOfThis;
  }, [viewMonth, todayLocal]);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  const handleDatePick = (d) => {
    const iso = fmtDate(d);
    if (!availableDays.has(iso)) return;
    setSelectedDate(iso);
  };

  // Submit booking with the given source data
  const submitBooking = async (data, slotDateArg, slotTimeArg) => {
    const slot_date = slotDateArg || selectedDate;
    const slot_time = slotTimeArg || selectedTime;
    if (!slot_date || !slot_time) {
      toast.error("Please pick a date and time");
      return false;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/uc-bookings/create`, {
        ...data,
        slot_date,
        slot_time,
      });
      const conf = {
        booking_id: res.data.booking_id,
        slot_date,
        slot_time,
        name: data.name,
        email: data.email,
      };
      setConfirmation(conf);
      if (onBooked) onBooked(conf);
      // Refresh availability
      try {
        const a = await axios.get(`${API}/api/uc-bookings/availability`, {
          params: { date: slot_date },
        });
        setSlots(a.data?.slots || []);
      } catch (_) {
        // ignore
      }
      return true;
    } catch (err) {
      const detail = err?.response?.data?.detail || "Booking failed. Please try again.";
      toast.error(typeof detail === "string" ? detail : "Booking failed. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSlotPick = async (slot) => {
    if (slot.status !== "available") return;
    setSelectedTime(slot.time);
    if (hasPrefill) {
      // Skip form and book immediately using prefilled data.
      // Pass slot_time explicitly because React state update is async.
      await submitBooking(
        {
          name: prefill.name,
          email: prefill.email,
          phone: prefill.phone,
          current_university: prefill.current_university || "",
          transfer_type: prefill.transfer_type || "",
          notes: prefill.notes || "",
        },
        selectedDate,
        slot.time,
      );
    } else {
      setShowForm(true);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm((p) => ({ ...p, phone: value.replace(/[^\d+]/g, "").slice(0, 15) }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) return toast.error("Please enter your full name");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error("Please enter a valid email");
    if (!form.phone || form.phone.length < 8) return toast.error("Please enter a valid phone number");
    if (!selectedDate || !selectedTime) return toast.error("Please pick a date and time");
    await submitBooking(form);
  };

  const handleBookAnother = () => {
    setConfirmation(null);
    setSelectedTime(null);
    setSelectedDate(null);
    setShowForm(false);
    if (!hasPrefill) {
      setForm({ name: "", email: "", phone: "", current_university: "", transfer_type: "", notes: "" });
    }
  };

  const handleCloseModal = () => {
    if (onClose) onClose(!!confirmation);
  };

  if (asModal && !isOpen) return null;

  const headerNode = (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
        <Sparkles className="w-4 h-4" />
        Pick a Time That Works for You
      </div>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3">
        {modeHeading ? (
          <>
            {modeHeading.split("?")[0]}
            <span className="text-emerald-600">?</span>
          </>
        ) : hasPrefill ? (
          <>One last step, <span className="text-emerald-600">{prefill.name?.split(" ")[0] || "there"}</span></>
        ) : (
          <>Book Your Free <span className="text-emerald-600">Consultation</span></>
        )}
      </h2>
      <p className="text-base text-slate-600 max-w-xl mx-auto">
        {hasPrefill
          ? "Pick a date and time below — our Berlin counsellor will confirm by email straight after."
          : "Choose a date and time — our Berlin counsellor will call you at the exact slot you pick. 30-minute call, no commitment."}
      </p>
    </div>
  );

  const calendarInner = (
    <>
      {confirmation ? (
        <ConfirmationCard
          confirmation={confirmation}
          onBookAnother={asModal ? null : handleBookAnother}
          onCloseModal={asModal ? handleCloseModal : null}
        />
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Calendar pane */}
            <div className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                  <CalendarDays className="w-5 h-5 text-emerald-600" />
                  {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={isPrevDisabled}
                    data-testid="cal-prev-month"
                    className={`p-2 rounded-lg transition-colors ${isPrevDisabled ? "text-slate-300 cursor-not-allowed" : "text-slate-600 hover:bg-slate-100"}`}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    data-testid="cal-next-month"
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAY_LABELS.map((w, i) => (
                  <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((d, idx) => {
                  if (!d) return <div key={idx} className="h-10" />;
                  const iso = fmtDate(d);
                  const isAvailable = availableDays.has(iso);
                  const isSelected = iso === selectedDate;
                  const isToday = iso === fmtDate(todayLocal);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDatePick(d)}
                      disabled={!isAvailable}
                      data-testid={`cal-day-${iso}`}
                      className={[
                        "h-10 rounded-lg text-sm font-medium transition-all relative",
                        isSelected
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                          : isAvailable
                          ? "text-slate-900 hover:bg-emerald-50 hover:text-emerald-700"
                          : "text-slate-300 cursor-not-allowed",
                        isToday && !isSelected ? "ring-1 ring-emerald-300" : "",
                      ].join(" ")}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              {loadingDays && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-4">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading available days…
                </div>
              )}
              {!loadingDays && availableDays.size === 0 && (
                <p className="text-xs text-slate-500 mt-4">No bookable days in this month. Try the next month.</p>
              )}

              <div className="flex items-center gap-4 mt-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span>
                  Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded ring-1 ring-emerald-300 inline-block"></span>
                  Today
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-100 inline-block"></span>
                  Unavailable
                </span>
              </div>
            </div>

            {/* Slots + form pane */}
            <div className="p-6 sm:p-8 bg-slate-50/40">
              {!selectedDate ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-500">
                  <CalendarDays className="w-12 h-12 text-emerald-200 mb-3" />
                  <p className="font-medium text-slate-700">Pick a date to see available times</p>
                  <p className="text-sm mt-1">All times shown in Berlin time (CET / CEST).</p>
                </div>
              ) : showForm ? (
                <BookingForm
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  form={form}
                  submitting={submitting}
                  onChange={handleFormChange}
                  onSubmit={handleSubmit}
                  onBack={() => {
                    setShowForm(false);
                    setSelectedTime(null);
                  }}
                />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-slate-900">
                      {fmtDisplayDate(selectedDate)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Times shown in Berlin time (CET / CEST)</p>

                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading slots…
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-slate-500">No slots configured for this day.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {slots.map((s) => {
                          const isAvail = s.status === "available";
                          const isBooked = s.status === "booked";
                          const isDisabled = s.status === "disabled";
                          const isBusy = submitting && selectedTime === s.time;
                          return (
                            <button
                              key={s.time}
                              type="button"
                              onClick={() => handleSlotPick(s)}
                              disabled={!isAvail || submitting}
                              data-testid={`slot-${s.time}`}
                              className={[
                                "px-3 py-2.5 rounded-lg text-sm font-medium border transition-all",
                                isAvail
                                  ? "bg-white border-slate-200 text-slate-900 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                                  : isBooked
                                  ? "bg-slate-100 border-slate-200 text-slate-400 line-through cursor-not-allowed"
                                  : isDisabled
                                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                  : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed",
                                isBusy ? "ring-2 ring-emerald-400" : "",
                              ].join(" ")}
                              title={
                                isAvail
                                  ? "Available"
                                  : isBooked
                                  ? "Already booked"
                                  : isDisabled
                                  ? "Unavailable"
                                  : "Past slot"
                              }
                            >
                              {isBusy ? (
                                <span className="inline-flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Booking…
                                </span>
                              ) : (
                                fmt12h(s.time)
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {hasPrefill && (
                        <p className="mt-4 text-[11px] text-slate-500">
                          We&apos;ll use the details you just submitted (<strong>{prefill.email}</strong>) — clicking a slot books it instantly.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (asModal) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
        data-testid="uc-booking-modal"
      >
        <div className="relative w-full max-w-5xl my-4 sm:my-8">
          <button
            type="button"
            onClick={handleCloseModal}
            data-testid="uc-booking-modal-close"
            className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 z-10 p-2 bg-white shadow-lg rounded-full text-slate-600 hover:text-slate-900 hover:scale-110 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="bg-gradient-to-b from-white via-emerald-50/40 to-white rounded-3xl p-6 sm:p-10 shadow-2xl">
            {headerNode}
            {calendarInner}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      id="book-consultation"
      className="py-20 lg:py-28 bg-gradient-to-b from-white via-emerald-50/40 to-white"
      data-testid="uc-booking-section"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {headerNode}
        {calendarInner}
      </div>
    </section>
  );
}

function BookingForm({ selectedDate, selectedTime, form, submitting, onChange, onSubmit, onBack }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="uc-booking-form">
      <button
        type="button"
        onClick={onBack}
        data-testid="booking-back-btn"
        className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Change time
      </button>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-xs font-medium text-emerald-700 mb-1">Your selected slot</p>
        <p className="text-base font-bold text-emerald-900">
          {fmtDisplayDate(selectedDate)} · {fmt12h(selectedTime)} Berlin time
        </p>
      </div>

      <Field icon={User} label="Full Name" name="name" value={form.name} onChange={onChange} required placeholder="John Doe" testid="bk-name" />
      <Field icon={Mail} label="Email" name="email" type="email" value={form.email} onChange={onChange} required placeholder="you@example.com" testid="bk-email" />
      <Field icon={Phone} label="Mobile Number" name="phone" value={form.phone} onChange={onChange} required placeholder="+91 9876543210" testid="bk-phone" />

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Current University (optional)</label>
          <input
            type="text"
            name="current_university"
            value={form.current_university}
            onChange={onChange}
            data-testid="bk-current-uni"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            placeholder="e.g. TU Berlin"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Looking For (optional)</label>
          <select
            name="transfer_type"
            value={form.transfer_type}
            onChange={onChange}
            data-testid="bk-transfer-type"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          >
            <option value="">Choose…</option>
            <option value="private_to_public">Private → Public</option>
            <option value="public_to_private">Public → Private</option>
            <option value="course_change">Course / Major Change</option>
            <option value="other">Other / Not Sure</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Anything we should know? (optional)</label>
        <textarea
          name="notes"
          rows={2}
          value={form.notes}
          onChange={onChange}
          data-testid="bk-notes"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          placeholder="Briefly tell us about your situation…"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        data-testid="confirm-booking-btn"
        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Booking…
          </>
        ) : (
          <>
            Confirm Booking
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
      <p className="text-[11px] text-slate-500 text-center">
        You&apos;ll get a confirmation email immediately, plus reminders 24 hours and 1 hour before your call.
      </p>
    </form>
  );
}

function Field({ icon: Icon, label, name, value, onChange, required, placeholder, type = "text", testid }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          data-testid={testid}
          className={`w-full ${Icon ? "pl-9" : "pl-3"} pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500`}
        />
      </div>
    </div>
  );
}

function ConfirmationCard({ confirmation, onBookAnother, onCloseModal }) {
  return (
    <div
      className="bg-white rounded-3xl shadow-xl border border-emerald-200 p-8 sm:p-12 text-center max-w-2xl mx-auto"
      data-testid="booking-confirmation"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-5">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>
      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">You&apos;re booked!</h3>
      <p className="text-slate-600 mb-6">
        Thanks, <strong>{confirmation.name}</strong>. We&apos;ve emailed your confirmation to{" "}
        <strong className="text-slate-900">{confirmation.email}</strong>.
      </p>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 inline-block mb-6">
        <p className="text-xs font-medium text-emerald-700 mb-1">Your consultation</p>
        <p className="text-lg font-bold text-emerald-900">
          {fmtDisplayDate(confirmation.slot_date)}
        </p>
        <p className="text-base font-semibold text-emerald-800">
          {fmt12h(confirmation.slot_time)} Berlin time
        </p>
      </div>

      <div className="text-left max-w-md mx-auto bg-slate-50 rounded-xl p-5 mb-6">
        <p className="text-sm font-semibold text-slate-900 mb-2">What happens next:</p>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li>📧 Confirmation email (just sent)</li>
          <li>🔔 Reminder email 24 hours before</li>
          <li>⏰ Reminder email 1 hour before</li>
          <li>📝 Follow-up email after your call</li>
        </ul>
      </div>

      <p className="text-xs text-slate-500 mb-4">Booking reference: {confirmation.booking_id.slice(0, 8)}</p>

      {onCloseModal ? (
        <button
          type="button"
          onClick={onCloseModal}
          data-testid="booking-close-btn"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
        >
          Done
        </button>
      ) : (
        <button
          type="button"
          onClick={onBookAnother}
          data-testid="book-another-btn"
          className="text-sm text-emerald-700 hover:text-emerald-800 font-medium underline"
        >
          Book another slot
        </button>
      )}
    </div>
  );
}
