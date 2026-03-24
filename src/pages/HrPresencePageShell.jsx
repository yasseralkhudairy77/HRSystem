import { Download, Filter, Plus, Printer, RefreshCcw, Save } from "lucide-react";

import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import FilterBar from "@/components/common/FilterBar";
import ModalTriggerCard from "@/components/common/ModalTriggerCard";
import PageHeader from "@/components/common/PageHeader";
import SummaryCard from "@/components/common/SummaryCard";
import { Button } from "@/components/ui/button";
import { hrPresencePageConfigs } from "@/data/hrPresence";

const actionIconMap = {
  Tambah: Plus,
  Filter,
  Export: Download,
  Print: Printer,
  Sinkronisasi: RefreshCcw,
  Simpan: Save,
};

function ActionButton({ label }) {
  const Icon = Object.entries(actionIconMap).find(([key]) => label.includes(key))?.[1] || Plus;

  return (
    <Button variant={label === "Simpan" || label === "Sinkronisasi" ? "default" : "outline"} className="rounded-xl">
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

export default function HrPresencePageShell({ pageKey }) {
  const config = hrPresencePageConfigs[pageKey];

  if (!config) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        description={config.description}
        breadcrumbItems={config.breadcrumbs.map((label) => ({ label }))}
        actions={config.actions.map((action) => (
          <ActionButton key={action} label={action} />
        ))}
      />

      {config.filters?.length ? <FilterBar filters={config.filters} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {config.summaries.map((summary) => (
          <SummaryCard key={summary.label} {...summary} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_340px]">
        <DataTable columns={config.columns} rows={config.rows} emptyState={<EmptyState {...config.emptyState} />} />

        <div className="space-y-4">
          <ModalTriggerCard title={config.modalTitle} description={config.modalDescription} triggerLabel={config.modalTriggerLabel} />
          <EmptyState title={config.emptyState.title} description={config.emptyState.description} actionLabel={config.emptyState.actionLabel} />
        </div>
      </div>
    </div>
  );
}
