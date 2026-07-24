"use client";

import * as React from "react";
import { Badge, Button, Input, Select, Textarea } from "@bcp/ui";
import { apiGet, apiPost } from "../../../lib/api-client";

interface AttendanceRecord { id: string; date: string; status: string }
interface LeaveRequest { id: string; leaveType: string; startDate: string; endDate: string; status: string; reason: string | null }

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "present", label: "Present" }, { value: "absent", label: "Absent" }, { value: "half_day", label: "Half day" }, { value: "leave", label: "Leave" }, { value: "holiday", label: "Holiday" },
];
const LEAVE_TYPE_OPTIONS = [{ value: "sick", label: "Sick" }, { value: "casual", label: "Casual" }, { value: "paid", label: "Paid" }, { value: "unpaid", label: "Unpaid" }, { value: "other", label: "Other" }];
const LEAVE_STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { pending: "warning", approved: "success", rejected: "destructive", cancelled: "outline" };

export function AttendanceLeaveTab({ studioUserId }: { studioUserId: string }) {
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([]);
  const [leave, setLeave] = React.useState<LeaveRequest[]>([]);
  const [attendanceDate, setAttendanceDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceStatus, setAttendanceStatus] = React.useState("present");
  const [leaveType, setLeaveType] = React.useState("casual");
  const [leaveStart, setLeaveStart] = React.useState("");
  const [leaveEnd, setLeaveEnd] = React.useState("");
  const [leaveReason, setLeaveReason] = React.useState("");
  const [leaveError, setLeaveError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [attendanceRes, leaveRes] = await Promise.all([
      apiGet<AttendanceRecord[]>(`/team-members/${studioUserId}/attendance`),
      apiGet<LeaveRequest[]>(`/leave-requests?studioUserId=${studioUserId}`),
    ]);
    if (attendanceRes.ok && attendanceRes.data) setAttendance(attendanceRes.data);
    if (leaveRes.ok && leaveRes.data) setLeave(leaveRes.data);
  }, [studioUserId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkAttendance() {
    await apiPost(`/team-members/${studioUserId}/attendance`, { date: new Date(attendanceDate).toISOString(), status: attendanceStatus });
    await load();
  }

  async function handleRequestLeave() {
    if (!leaveStart || !leaveEnd) return;
    setLeaveError(null);
    const res = await apiPost(`/team-members/${studioUserId}/leave-requests`, { leaveType, startDate: new Date(leaveStart).toISOString(), endDate: new Date(leaveEnd).toISOString(), reason: leaveReason || undefined });
    if (!res.ok) {
      setLeaveError(res.error?.message ?? "Could not submit this leave request");
      return;
    }
    setLeaveStart(""); setLeaveEnd(""); setLeaveReason("");
    await load();
  }

  async function handleLeaveDecision(id: string, decision: "approved" | "rejected") {
    await apiPost(`/leave-requests/${id}/decision`, { decision });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Attendance</h3>
        <ul className="mb-2 flex flex-col divide-y divide-border">
          {attendance.slice(0, 10).map((record) => (
            <li key={record.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>{new Date(record.date).toLocaleDateString("en-IN")}</span>
              <Badge variant="outline" className="capitalize">{record.status.replace(/_/g, " ")}</Badge>
            </li>
          ))}
          {attendance.length === 0 && <p className="py-2 text-xs text-muted-foreground">No attendance recorded yet.</p>}
        </ul>
        <div className="flex gap-2">
          <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-40" />
          <Select value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value)} options={ATTENDANCE_STATUS_OPTIONS} />
          <Button type="button" size="sm" onClick={() => void handleMarkAttendance()}>Mark</Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Leave</h3>
        <ul className="mb-2 flex flex-col divide-y divide-border">
          {leave.map((request) => (
            <li key={request.id} className="flex items-center justify-between py-2 text-sm">
              <span className="capitalize">{request.leaveType} · {new Date(request.startDate).toLocaleDateString("en-IN")}–{new Date(request.endDate).toLocaleDateString("en-IN")}</span>
              <div className="flex items-center gap-2">
                <Badge variant={LEAVE_STATUS_VARIANT[request.status] ?? "outline"} className="capitalize">{request.status}</Badge>
                {request.status === "pending" && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleLeaveDecision(request.id, "rejected")}>Reject</Button>
                    <Button type="button" size="sm" onClick={() => void handleLeaveDecision(request.id, "approved")}>Approve</Button>
                  </>
                )}
              </div>
            </li>
          ))}
          {leave.length === 0 && <p className="py-2 text-xs text-muted-foreground">No leave requests.</p>}
        </ul>
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex gap-2">
            <Select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} options={LEAVE_TYPE_OPTIONS} className="w-32" />
            <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
            <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
          </div>
          <Textarea placeholder="Reason (optional)" rows={2} value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
          {leaveError && <p role="alert" className="text-sm text-destructive">{leaveError}</p>}
          <Button type="button" size="sm" className="self-start" onClick={() => void handleRequestLeave()}>Request leave</Button>
        </div>
      </div>
    </div>
  );
}
