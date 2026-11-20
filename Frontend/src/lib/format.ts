// "Wed, Nov 4" and "3:43 p.m." for showing ride departure times.
export const dateFormat = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
export const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' })
