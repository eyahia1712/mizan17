/** One stroke weight, one grid, one library. */
const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export const Send     = (p) => <svg {...s} {...p}><path d="M7 17 17 7M8.5 7H17v8.5" /></svg>;
export const Receive  = (p) => <svg {...s} {...p}><path d="M17 7 7 17M15.5 17H7V8.5" /></svg>;
export const Split    = (p) => <svg {...s} {...p}><circle cx="9" cy="8" r="3" /><path d="M17.5 8.2a2.6 2.6 0 1 0-.1 5.2M3.5 19a5.5 5.5 0 0 1 11 0M16 13.6a5.5 5.5 0 0 1 4.5 5.4" /></svg>;
export const Cash     = (p) => <svg {...s} {...p}><path d="M3 9.5 12 4l9 5.5M4.5 10v8M9.5 10v8M14.5 10v8M19.5 10v8M3 20h18" /></svg>;
export const Tick     = (p) => <svg {...s} {...p} strokeWidth={2.4}><path d="M20 6 9 17l-5-5" /></svg>;
export const Home     = (p) => <svg {...s} {...p}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></svg>;
export const Clock    = (p) => <svg {...s} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>;
export const Copy     = (p) => <svg {...s} {...p}><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M15 5.5A2.5 2.5 0 0 0 12.5 4H6a2 2 0 0 0-2 2v6.5A2.5 2.5 0 0 0 6.5 15" /></svg>;
export const External = (p) => <svg {...s} {...p}><path d="M14 4h6v6M20 4l-9 9M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" /></svg>;

