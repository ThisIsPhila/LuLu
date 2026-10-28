/** The blinking eyes are adapted from the supplied avatar component. */
export function LuEyes({ wheel = false }: { wheel?: boolean }) {
  return <span className={`lu-orb-eyes${wheel ? ' lu-orb-eyes-wheel' : ''}`} aria-hidden="true"><span /><span /></span>;
}
