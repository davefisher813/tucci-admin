export default function KpiCard({
  label,
  value,
  detail,
  bad = false,
}: {
  label: string;
  value: string;
  detail: string;
  bad?: boolean;
}) {
  return (
    <div className="rounded-[15px] border border-line bg-paper px-5 pb-[17px] pt-[19px]">
      <div className="font-display text-[11px] font-extrabold tracking-[.01em] text-accent">
        {label}
      </div>
      <div className="tnum mt-[11px] font-display text-[31px] font-extrabold leading-none tracking-[-.025em] text-text">
        {value}
      </div>
      <div
        className={`mt-[10px] font-display text-[11.5px] font-bold ${
          bad ? "text-danger" : "text-success"
        }`}
      >
        {detail}
      </div>
    </div>
  );
}
