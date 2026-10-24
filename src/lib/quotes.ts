export type TimeSlot = "dawn" | "morning" | "afternoon" | "evening" | "night" | "midnight";

export interface TimeSlotData {
  slot: TimeSlot;
  iconName: "Sunrise" | "Sun" | "Sunset" | "Moon" | "Sparkles";
  iconColor: string;
  greetings: string[];
  subtitles: string[];
  quotes: string[];
}

export const TIME_DATA: Record<TimeSlot, TimeSlotData> = {
  dawn: {
    slot: "dawn",
    iconName: "Sunrise",
    iconColor: "text-amber-400",
    greetings: [
      "Good morning",
      "Rise & conquer",
      "Top of the morning",
      "Fresh brew energy",
      "Up with the sun",
      "Early bird mode",
    ],
    subtitles: [
      "Coffee is loading, bugs are trembling.",
      "Sun's up. Time to turn caffeine into code and momentum.",
      "Zero Slack pings, zero notifications, maximum brain bandwidth.",
      "The world is still asleep—let's get your highest-priority task done first.",
      "May your coffee be hot and your compile times under two seconds.",
      "Quiet mornings create the loudest victories.",
      "A peaceful morning is an unfair productivity advantage.",
    ],
    quotes: [
      "First coffee, then we conquer the backlog.",
      "Eat the biggest frog before 9 AM, and the rest of the day is a breeze.",
      "The early bird gets the pull request merged without merge conflicts.",
      "Morning routine: 10% stretching, 90% staring at yesterday's code until it clicks.",
      "Start today with a clean slate and a strong cup of determination.",
      "Progress isn't made by snoozing your ambitions.",
      "Waking up early is tough, but debugging at 5 PM is tougher.",
      "Today's goal: write code so clean even your future self says thank you.",
      "Sunlight on your face, tasks on your board. Let's make it count.",
    ],
  },
  morning: {
    slot: "morning",
    iconName: "Sun",
    iconColor: "text-amber-500",
    greetings: [
      "Good morning",
      "Locked in",
      "Deep work mode",
      "Peak focus time",
      "In the zone",
      "Ready to roll",
    ],
    subtitles: [
      "Your prefrontal cortex is at 100%. Let's put it to work.",
      "Tabs open: 42. Distractions allowed: 0. Focus: 100%.",
      "One solid pomodoro at a time, you're building something great.",
      "Time to slay the most important dragon on your list.",
      "You are one focused sprint away from an epic day.",
      "Notification mute: on. Main character productivity: engaged.",
      "The best time to focus is right now, before lunchtime hits.",
    ],
    quotes: [
      "There are 10 types of people: those who focus, and those with 74 open tabs.",
      "Weeks of coding can save you hours of planning. Think first, build second.",
      "Focus is the art of knowing what to politely ignore.",
      "Done is dramatically better than perfect. Ship it!",
      "The secret to getting ahead is simply starting this timer.",
      "Code never lies, comments sometimes do, and the timer always counts.",
      "Small daily wins compound into unrecognizable greatness.",
      "Simplicity is prerequisite for reliability. Also, closing social media helps.",
      "Focus on the next hour, not the whole mountain.",
    ],
  },
  afternoon: {
    slot: "afternoon",
    iconName: "Sun",
    iconColor: "text-orange-400",
    greetings: [
      "Good afternoon",
      "Afternoon hustle",
      "Powering through",
      "Second wind activated",
      "Staying sharp",
      "Afternoon warrior",
    ],
    subtitles: [
      "The 2 PM slump is a myth when you've got willpower (and cold water).",
      "Midday checkpoint: stretch your shoulders and conquer the next block.",
      "Half the day is behind you, but your best focus is right now.",
      "Refuel, refocus, and finish what you started this morning.",
      "Don't let the post-lunch food coma win—start that timer and roll.",
      "Keep the momentum alive; the afternoon belongs to the doers.",
      "Hydrate, take a deep breath, and dive back in.",
    ],
    quotes: [
      "If at first you don't succeed, call it version 1.0.",
      "Energy flows where attention goes. Don't waste it on tab switching.",
      "The afternoon slump has met its match: an unstoppable timer.",
      "You didn't come this far today just to scroll for 20 minutes.",
      "A tricky bug in the afternoon is just tomorrow's proud story.",
      "Hydrate, blink, sit up straight, and crush this task.",
      "Consistency is showing up even when lunch was heavy.",
      "One problem at a time. The mountain will move.",
      "Great coders don't write more code; they delete the fluff.",
    ],
  },
  evening: {
    slot: "evening",
    iconName: "Sunset",
    iconColor: "text-amber-500",
    greetings: [
      "Good evening",
      "Evening sprint",
      "The final stretch",
      "Golden hour focus",
      "Finishing strong",
      "Wrapping up",
    ],
    subtitles: [
      "Finish strong so tonight's dinner tastes like pure victory.",
      "Wrap up your open threads. Leave no loose ends for tomorrow.",
      "Golden hour focus hits different when you're knocking out goals.",
      "Almost time to close the laptop and celebrate today's wins.",
      "Clear your desk, tick the last box, and own the evening.",
      "One last clean commit and you can call today a masterpiece.",
      "Review your wins—you did a lot more today than you give yourself credit for.",
    ],
    quotes: [
      "Leave nothing on your board that will haunt your dinner tonight.",
      "It always seems impossible until it's committed and merged.",
      "A productive day makes evening rest ten times sweeter.",
      "The difference between ordinary and extraordinary is that little evening sprint.",
      "Celebrate the small wins—they added up to a massive day.",
      "Don't count the minutes; make the minutes count before you clock out.",
      "Tomorrow's success is set up by how cleanly you wrap up tonight.",
      "Your future self will thank you for closing this task right now.",
    ],
  },
  night: {
    slot: "night",
    iconName: "Moon",
    iconColor: "text-indigo-400",
    greetings: [
      "Good evening",
      "Night owl session",
      "Quiet hours",
      "Late night groove",
      "Night mode active",
      "Calm & focused",
    ],
    subtitles: [
      "Dark mode is not just a theme, it's a lifestyle.",
      "Quiet world outside, deep thoughts inside.",
      "The best ideas strike when the world goes quiet.",
      "Gentle reminder: great minds need great sleep soon.",
      "Debugging under the stars with zero notifications.",
      "Final review of the day: celebrate what you conquered.",
      "Wind down your thoughts; you've earned a peaceful night.",
    ],
    quotes: [
      "Night owl rule: The solution appears 2 minutes before you give up and sleep.",
      "Silence is golden, especially when your tests pass on the first run.",
      "Work hard under the moon, rest easy under the sheets.",
      "Sleep is the ultimate defragmentation tool for your brain.",
      "Even Batman had to recharge in the Batcave. Wind down soon.",
      "Great dreams require great rest. Finish this session and recharge.",
      "The code will still be here tomorrow. Make peace with today's wins.",
    ],
  },
  midnight: {
    slot: "midnight",
    iconName: "Sparkles",
    iconColor: "text-violet-400",
    greetings: [
      "Burning the midnight oil",
      "Night owl extraordinaire",
      "Late night legend",
      "Stealth mode",
      "Midnight hacker",
    ],
    subtitles: [
      "It's past midnight! Remember that sleep is a productivity superpower.",
      "Quiet hour, deep work. Don't forget to head to bed soon.",
      "The compiler never sleeps, but humans definitely should.",
      "Wrap up this thought, save your work, and get some rest!",
      "Late night inspiration is magical, but rest is essential.",
      "Commit your work, close your tabs, and give your eyes a break.",
    ],
    quotes: [
      "Why sleep when you can fix one more mysterious bug? (Just kidding, go to sleep soon).",
      "The best code written at 3 AM is the code you rewrite at 10 AM. Be gentle with yourself.",
      "You've worked hard today. Wrap this up, future legend, and sleep well.",
      "Sleep is not a bug; it's an essential operating system update.",
      "One last commit, then shut the lid. Rest fuels greatness.",
    ],
  },
};

/**
 * Accurately determines the current time slot based on local hour.
 * 05:00 - 08:59 => dawn (Early Morning)
 * 09:00 - 11:59 => morning (Late Morning / Peak Focus)
 * 12:00 - 16:59 => afternoon (Afternoon)
 * 17:00 - 20:59 => evening (Evening Wrap-up)
 * 21:00 - 23:59 => night (Night Owls)
 * 00:00 - 04:59 => midnight (Deep Late Night)
 */
export function getTimeSlot(date = new Date()): TimeSlot {
  const h = date.getHours();
  if (h >= 5 && h < 9) return "dawn";
  if (h >= 9 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  if (h >= 21) return "night";
  return "midnight";
}

/**
 * Returns time slot data with safe guaranteed fallback.
 */
export function getTimeSlotData(date = new Date()): TimeSlotData {
  const slot = getTimeSlot(date);
  return TIME_DATA[slot] || TIME_DATA.morning;
}
