interface Props {
  className?: string;
}

export default function Skeleton({ className = "" }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`bg-line/40 rounded-md animate-pulse motion-reduce:animate-none ${className}`}
    />
  );
}
