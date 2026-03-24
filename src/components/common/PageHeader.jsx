import SectionTitle from "@/components/common/SectionTitle";

import Breadcrumb from "./Breadcrumb";

export default function PageHeader({ title, description, breadcrumbItems = [], actions }) {
  return (
    <div className="space-y-4 rounded-[28px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.96))] p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Breadcrumb items={breadcrumbItems} />
          <SectionTitle title={title} subtitle={description} />
        </div>

        {actions ? <div className="flex flex-wrap gap-3 xl:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
