interface Props {
  provider: string;
  region: string;
  fromAtlas?: boolean;
}

const PROVIDER_STYLES: Record<string, { label: string; text: string; dot: string; border: string; bg: string }> = {
  aws: {
    label: 'AWS',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
  },
  gcp: {
    label: 'GCP',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
  },
  azure: {
    label: 'Azure',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
  },
};

const DEFAULT_STYLE = {
  label: '',
  text: 'text-gray-400',
  dot: 'bg-gray-400',
  border: 'border-gray-600/40',
  bg: 'bg-gray-700/30',
};

export default function ProviderBadge({ provider, region, fromAtlas = false }: Props) {
  const key = provider.toLowerCase();
  const style = PROVIDER_STYLES[key] ?? DEFAULT_STYLE;
  const label = style.label || provider.toUpperCase();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono ${style.bg} ${style.border}`}
      title={fromAtlas ? 'Live from Atlas API' : 'From environment config'}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span className={`font-semibold tracking-wide ${style.text}`}>{label}</span>
      <span className="text-gray-600 select-none">/</span>
      <span className="text-gray-300">{region}</span>
      {fromAtlas && (
        <span className="text-mdb-green/70 text-[10px] leading-none select-none">●</span>
      )}
    </div>
  );
}
