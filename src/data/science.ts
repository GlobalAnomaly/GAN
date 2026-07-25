/**
 * Seed science entries, written to science-template.md.
 *
 * Same two deliberate gaps as the case seed: no invented image URLs and no
 * guessed deep links. NASA, ESA and ESO imagery is usable with a credit line,
 * so `images` is ready for real files with their credits attached.
 *
 * The entries were chosen to exercise the full status range, including one
 * genuinely disputed result, because a section that only carries confirmed
 * findings teaches the reader nothing about how science actually settles.
 */

import type { ScienceRecord } from "@/lib/types";

type SeedEntry = Omit<ScienceRecord, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

const seed: SeedEntry[] = [
  {
    id: "s-3i-atlas",
    title: "A third visitor from another star system is passing through our solar system",
    slug: "3i-atlas-interstellar-object",
    summary:
      "An object called 3I/ATLAS is crossing our neighbourhood on a path that shows it formed somewhere else. It is only the third such visitor astronomers have caught.",
    topic: "interstellar_objects",
    status: "confirmed",
    institutions: ["ATLAS survey", "NASA", "European Southern Observatory"],
    body_found:
      "In July 2025 a survey telescope in Chile picked up a faint moving point of light that turned out not to belong here. Astronomers named it 3I/ATLAS. The 3I means it is the third interstellar object on record, after 1I/'Oumuamua in 2017 and 2I/Borisov in 2019. It is a comet, and it has been shedding gas and dust as it warms on its way past the Sun.",
    body_how:
      "Its orbit gives it away. Everything born in our solar system travels on a closed loop around the Sun, held by the Sun's gravity. 3I/ATLAS is moving too fast for that, on a path that opens outward rather than closing, which means it arrived from interstellar space and will leave again. Astronomers work this out by measuring its position over many nights and fitting a curve to the motion, the same arithmetic used for any comet.",
    body_why:
      "Interstellar objects are physical samples from other star systems that arrive at our doorstep. We cannot yet send a spacecraft to another star, so a visitor that comes to us is the only way to study material that formed around a different sun. Each one is a chance to ask whether the ingredients that built our planets, and eventually us, are common elsewhere or unusual. Three known visitors is a small sample, but it is three more than we had a decade ago.",
    body_caveat:
      "An unusual object is not evidence of alien technology. Everything observed about 3I/ATLAS so far is consistent with a natural comet: it has a coma of gas and dust, and it brightens as it nears the Sun the way comets do. Some researchers have published estimates suggesting it may be considerably older than the Sun, based on where in the galaxy its trajectory implies it came from. Those are inferences from its motion, not measurements of its age, and they carry real uncertainty.",
    date: "2025-07-01",
    view_count: 0,
    published: true,
    images: [],
    sources: [
      {
        id: "ss-3i-1",
        name: "NASA",
        url: "https://science.nasa.gov/",
      },
      {
        id: "ss-3i-2",
        name: "European Southern Observatory",
        url: "https://www.eso.org/",
      },
    ],
  },

  {
    id: "s-k2-18b",
    title: "A possible sign of life on a distant planet did not survive closer scrutiny",
    slug: "k2-18b-biosignature-debate",
    summary:
      "A team reported a gas on the planet K2-18b that on Earth is made almost entirely by living things. Several independent reanalyses of the same data found the signal was not strong enough to claim.",
    topic: "astrobiology",
    status: "disputed",
    institutions: ["University of Cambridge", "NASA", "James Webb Space Telescope"],
    body_found:
      "K2-18b is a planet about eight times the mass of Earth, orbiting a small red star roughly 120 light-years away. In 2023 and again in 2025, a team led from Cambridge reported that observations from the James Webb Space Telescope were consistent with dimethyl sulfide in its atmosphere. On Earth that gas is produced almost entirely by marine life, which is why it is treated as a biosignature, a chemical fingerprint that living things tend to leave. The 2025 paper described the evidence as the strongest yet for such a gas on any exoplanet.",
    body_how:
      "When the planet passes in front of its star, a sliver of starlight filters through its atmosphere on the way to us. Different gases absorb different colours, so the light that arrives carries a barcode of what it passed through. Webb reads that barcode. The difficulty is that the signal is tiny, and turning it into a list of gases means fitting models to noisy data, where the answer depends partly on which models you fit.",
    body_why:
      "If a biosignature gas were ever confirmed on a planet around another star, it would be the first evidence that life is not confined to Earth. That is the largest question the field has, which is exactly why the standard of proof has to be high. This episode matters as much for how the claim was tested as for the claim itself.",
    body_caveat:
      "This is not a detection of life, and as things stand it is not a confirmed detection of the gas either. Several independent groups reanalysed the same Webb data and found that the evidence for dimethyl sulfide fell below the threshold normally required, with some concluding the data are equally well explained without it. Others have pointed out that the gas can be produced without life at all, so even a confirmed detection would not settle the question. There is also no agreement on what kind of planet K2-18b is: whether it has a liquid water ocean or a deep hydrogen atmosphere with no surface is itself unresolved.",
    date: "2025-04-17",
    view_count: 0,
    published: true,
    images: [],
    sources: [
      {
        id: "ss-k2-1",
        name: "NASA Exoplanet Archive",
        url: "https://exoplanetarchive.ipac.caltech.edu/",
      },
      {
        id: "ss-k2-2",
        name: "NASA, James Webb Space Telescope",
        url: "https://science.nasa.gov/mission/webb/",
      },
    ],
  },

  {
    id: "s-trappist-1",
    title: "Seven Earth-sized planets circle one small star, and Webb is checking them for air",
    slug: "trappist-1-system",
    summary:
      "The TRAPPIST-1 system holds seven rocky planets around a star barely larger than Jupiter. Whether any of them kept an atmosphere is the question now being tested.",
    topic: "exoplanets",
    status: "confirmed",
    institutions: ["NASA", "European Southern Observatory", "Spitzer Space Telescope"],
    body_found:
      "About 40 light-years away, a cool red dwarf star named TRAPPIST-1 is orbited by seven planets close to Earth in size. Several sit in the range of distances where a planet could hold liquid water, if it has an atmosphere to hold it. The whole system is compact enough to fit comfortably inside the orbit of Mercury, so the planets circle their star in a matter of days rather than months.",
    body_how:
      "Each planet reveals itself by dimming the star slightly as it passes in front, like a moth crossing a streetlight. Because the star is small and dim, an Earth-sized planet blocks a relatively large fraction of its light, which is what makes such small worlds detectable here at all. Timing the dips gives the orbits, and the way the planets tug on each other gives their masses.",
    body_why:
      "Small red stars are the most common kind in the galaxy, so whether their planets can hold on to atmospheres shapes how many habitable worlds there might be overall. TRAPPIST-1 is the best laboratory we have for that question, because it offers seven test cases around one star rather than one planet in isolation.",
    body_caveat:
      "Being Earth-sized and at the right distance is not the same as being habitable. Webb observations of the two innermost planets found no sign of a thick atmosphere, which is consistent with the concern that flares from an active red dwarf can strip a close-in planet bare. The outer planets have not been ruled either way. No biosignature has been detected in this system, and none has been claimed.",
    date: "2017-02-22",
    view_count: 0,
    published: true,
    images: [],
    sources: [
      {
        id: "ss-trappist-1",
        name: "NASA Exoplanet Archive",
        url: "https://exoplanetarchive.ipac.caltech.edu/",
      },
      {
        id: "ss-trappist-2",
        name: "European Southern Observatory",
        url: "https://www.eso.org/",
      },
    ],
  },

  {
    id: "s-wow-signal",
    title: "A 72-second radio signal from 1977 has never been explained or heard again",
    slug: "wow-signal",
    summary:
      "An Ohio radio telescope recorded a strong, narrow signal from the direction of Sagittarius. Decades of listening at the same spot have turned up nothing since.",
    topic: "space_signals",
    status: "candidate",
    institutions: ["Ohio State University", "SETI Institute"],
    body_found:
      "On 15 August 1977 the Big Ear radio telescope at Ohio State recorded a burst of radio energy far stronger than the background, lasting the full 72 seconds the telescope's fixed beam would have kept any fixed point in view. The astronomer reviewing the printout circled it and wrote Wow! in the margin, which is how it got its name. It came from the direction of the constellation Sagittarius.",
    body_how:
      "Big Ear did not steer. It stared at a strip of sky and let the Earth's rotation carry sources through its beam, so a genuine object beyond Earth should rise and fade over about 72 seconds. The signal did exactly that, which is the main reason it was taken seriously: it behaved like something in the sky rather than something on the ground. It was also narrow in frequency, sitting close to the natural emission frequency of hydrogen, a band long argued to be a sensible place to listen.",
    body_why:
      "The Wow! signal is the single most cited candidate in the history of the search for radio technosignatures, and it is a useful benchmark for how the field handles a result it cannot repeat. A signal that cannot be observed again cannot be checked, and the discipline's answer has been to keep the case open rather than either dismiss it or claim it.",
    body_caveat:
      "This is not evidence of an extraterrestrial transmission. It was never detected again despite repeated searches with more sensitive instruments, and a result that cannot be reproduced cannot be confirmed. Explanations put forward over the years include a passing comet, since ruled unlikely by most researchers, and more recently a proposal that clouds of cold hydrogen briefly brightened by a burst from a magnetar could produce a similar signature. None of these has been established. Earthly interference has never been fully excluded either.",
    date: "1977-08-15",
    view_count: 0,
    published: true,
    images: [],
    sources: [
      {
        id: "ss-wow-1",
        name: "SETI Institute",
        url: "https://www.seti.org/",
      },
    ],
  },
];

const SEEDED_AT = "2026-01-01T00:00:00.000Z";

export const SEED_SCIENCE: ScienceRecord[] = seed.map((e) => ({
  ...e,
  created_at: e.created_at ?? SEEDED_AT,
  updated_at: e.updated_at ?? SEEDED_AT,
}));
