import PresenceSummaryCard from "@/components/hrPresence/PresenceSummaryCard";

export default function DeviceStatusCard({ label, value, note, tone }) {
  return <PresenceSummaryCard label={label} value={value} note={note} tone={tone} />;
}
