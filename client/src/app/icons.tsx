interface IconProps {
  directional?: boolean;
}

function Icon({ directional = false, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg className={directional ? "icon icon-directional" : "icon"} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

export function CurrentEveningIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </Icon>
  );
}

export function HistoryIcon() {
  return (
    <Icon directional>
      <path
        d="M12 6a6 6 0 1 1-5.2 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M6 4.5V9h4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v3.5l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
}

export function StatsIcon() {
  return (
    <Icon>
      <path d="M5 19V11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 19V7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 19V13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
}
