type OrganizationConnectorProps = {
  orientation?: "vertical";
};

export default function OrganizationConnector({ orientation = "vertical" }: OrganizationConnectorProps) {
  if (orientation === "vertical") {
    return <div aria-hidden="true" className="my-2 h-6 w-px bg-slate-200" />;
  }

  return null;
}
