/**
 * Seed cases.
 *
 * Hand-entered flagship entries, written to editorial-template.md. They exist
 * to prove the data model and give the site something real to render before
 * the bot and Supabase arrive. Once Supabase is live these move into the
 * database and this file goes away.
 *
 * Two deliberate gaps, both honest rather than lazy:
 *
 *   - `media` is empty on every case. Embed URLs must be the real ones, and a
 *     guessed video ID is worse than none: it either breaks or, worse, shows
 *     the wrong footage under a sourced account. Paste real embeds in.
 *   - `source_url` is set only where the URL is stable and known. Where a deep
 *     link would be a guess, the source is named without one. seed-source-list
 *     already says to verify every URL at build time.
 *
 * Everything in the prose below is drawn from the public record. Where the
 * record is thin or contested, that belongs in body_unknown, not smoothed over.
 */

import type { CaseRecord } from "@/lib/types";

type SeedCase = Omit<CaseRecord, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

const seed: SeedCase[] = [
  // -------------------------------------------------------------------------
  // Acknowledged
  // -------------------------------------------------------------------------
  {
    id: "c-rendlesham",
    title:
      "US airmen report a landed craft in Rendlesham Forest over three nights",
    slug: "rendlesham-forest-1980",
    summary:
      "Airmen stationed at two US bases in Suffolk reported lights and a structured object in the forest between them. A deputy base commander's memo to the Ministry of Defence survives as an official record.",
    body_footage:
      "There is no known film of the events. What exists instead is documentary: a memo written by the deputy base commander two weeks afterwards, and an audio recording made in the forest on the third night as personnel moved through it. The memo describes a metallic object, triangular in shape, that reportedly illuminated the forest floor before moving off through the trees. On the later night the recording captures personnel describing lights in the sky and indentations found in the ground.",
    body_testimony:
      "Lieutenant Colonel Charles Halt, then deputy commander of RAF Bentwaters, wrote the memo and later stated publicly that he witnessed lights he could not account for. Sergeant Jim Penniston and Airman First Class John Burroughs, who went into the forest on the first night, have both said they encountered an object at close range. Their accounts of what they touched or saw have shifted in emphasis over four decades, and they differ from one another on points of detail. The Ministry of Defence's own file records that the department assessed the reports and considered them of no defence significance.",
    body_status:
      "The UK Ministry of Defence released its Rendlesham file through the National Archives, which is why the memo is a public document rather than a claim about one. The MoD position was that nothing of defence significance occurred and that no further investigation was warranted. It did not offer an identification of what the airmen saw. A conventional explanation has been proposed by others, chiefly that the Orfordness lighthouse and a bright meteor account for the sightings; several of the witnesses reject it, and it has not been adopted as an official finding.",
    body_unknown:
      "No official body has said what the airmen encountered. The ground indentations were never independently analysed to a conclusion. The radiation readings recorded in the memo have been read as both slightly elevated and as within background, depending on who is interpreting the instrument. The witnesses' own accounts have grown more detailed over time, which is a known feature of long-recalled testimony and makes the earliest statements the more useful record.",
    date_of_event: "1980-12-26",
    date_precision: "day",
    location_name: "Rendlesham Forest, Suffolk",
    continent: "europe",
    country: "United Kingdom",
    location_unknown: false,
    classification: "acknowledged",
    classification_reason:
      "The Ministry of Defence released its own file on the reports and offered no conventional explanation for them.",
    view_count: 0,
    published: true,
    media: [],
    documents: [
      {
        id: "d-rendlesham-1",
        title: "Ministry of Defence UFO files",
        source_url: "https://www.nationalarchives.gov.uk/ufos/",
        source_note:
          "The MoD file series released through the UK National Archives, which includes the Rendlesham material.",
      },
    ],
    sources: [
      {
        id: "s-rendlesham-1",
        source_name: "The National Archives (UK), Ministry of Defence UFO files",
        source_url: "https://www.nationalarchives.gov.uk/ufos/",
        source_type: "govt",
      },
    ],
    tags: [
      { id: "t-military", name: "Military witnesses", slug: "military-witnesses" },
      { id: "t-official-file", name: "Official file", slug: "official-file" },
      { id: "t-landing", name: "Reported landing trace", slug: "landing-trace" },
    ],
  },

  {
    id: "c-nimitz",
    title:
      "Navy pilots report an object off California that Navy radar had tracked for days",
    slug: "uss-nimitz-2004",
    summary:
      "Two F/A-18F crews were vectored to an object detected by a cruiser's radar. The Pentagon later confirmed the infrared video that came out of the encounter was genuine Navy footage.",
    body_footage:
      "The surviving footage is a short infrared clip recorded by a targeting pod aboard an F/A-18F. It shows a small object against the sky, without visible wings, rotor, or exhaust plume. The camera struggles to hold a lock on it. Near the end of the clip the object moves left out of frame faster than the pod can follow. Nothing in the video establishes the object's size or distance on its own; those come from the crews and the radar operators, not the picture.",
    body_testimony:
      "Commander David Fravor and Lieutenant Commander Alex Dietrich, who flew the intercept, have both described in named public accounts an object roughly the size of an airliner fuselage, moving over a disturbance in the water, which then accelerated away in a manner neither could account for. Senior Chief Kevin Day, a radar operator aboard the USS Princeton, has said the cruiser's radar had been tracking objects descending from very high altitude over several days before the intercept was ordered. Fravor has stated the object's acceleration was beyond anything he had trained against.",
    body_status:
      "The Department of Defense formally released the video in April 2020 and confirmed it was authentic Navy footage, having already acknowledged its authenticity in 2019. The Pentagon's stated reason for release was to clear up public confusion about whether the material circulating was real. No conventional identification has been offered. The Navy has said the objects in this and related encounters remain unidentified. The All-domain Anomaly Resolution Office has since reviewed historical cases of this kind without publishing a resolution for this one.",
    body_unknown:
      "What the object was has not been established. The video alone cannot fix its size, altitude, or speed, so those figures rest on witness estimates and radar data that has not been released in full. The relationship between the radar tracks over several days and the object the pilots saw has not been publicly demonstrated. No physical evidence exists.",
    date_of_event: "2004-11-14",
    date_precision: "day",
    location_name: "Pacific Ocean, off southern California",
    continent: "north_america",
    country: "United States",
    location_unknown: false,
    classification: "acknowledged",
    classification_reason:
      "The Department of Defense released the footage, confirmed it as authentic, and has not offered a conventional explanation.",
    view_count: 0,
    published: true,
    media: [],
    documents: [
      {
        id: "d-nimitz-1",
        title: "All-domain Anomaly Resolution Office (AARO) publications",
        source_url: "https://www.aaro.mil/",
        source_note:
          "The Pentagon office responsible for UAP reporting and the ongoing declassified releases.",
      },
    ],
    sources: [
      {
        id: "s-nimitz-1",
        source_name: "U.S. Department of Defense",
        source_url: "https://www.defense.gov/",
        source_type: "govt",
      },
      {
        id: "s-nimitz-2",
        source_name: "All-domain Anomaly Resolution Office",
        source_url: "https://www.aaro.mil/",
        source_type: "govt",
      },
    ],
    tags: [
      { id: "t-military", name: "Military witnesses", slug: "military-witnesses" },
      { id: "t-radar", name: "Radar data", slug: "radar-data" },
      { id: "t-navy", name: "Naval aviation", slug: "naval-aviation" },
    ],
  },

  {
    id: "c-trans-en-provence",
    title:
      "France's official UAP unit investigates a ground trace at Trans-en-Provence",
    slug: "trans-en-provence-1981",
    summary:
      "A gardener reported an object landing briefly in his field. The French space agency's UAP unit collected soil and plant samples the next day and its file remains open and unexplained.",
    body_footage:
      "No footage exists. The record is an investigation file: gendarmerie statements taken the following day, photographs of two concentric circular marks on the ground, and soil and vegetation samples collected from inside and outside the marks. Laboratory analysis reported differences between samples taken at the centre and at the edges, including changes in the plants growing there.",
    body_testimony:
      "The witness, a gardener working on his property, told gendarmes he heard a low whistling sound and saw a small object descend into his field, rest briefly on the ground, and leave. He was the only witness. GEIPAN, the UAP unit of the French national space agency CNES, has stated the case is one of the most thoroughly documented in its archive and that it remains unexplained under its own classification system.",
    body_status:
      "GEIPAN investigated through official channels and publishes the file in its searchable public archive, which makes this an officially collected case rather than an anecdote. The unit classified it in its category for cases that remain unexplained after investigation. The physical analyses were carried out by French laboratories and reported changes in the sampled material that the investigators did not attribute to a known cause. Other researchers have questioned how much the plant analysis can carry, given a single witness and one sampling visit.",
    body_unknown:
      "There is one witness and no corroborating observation. What produced the ground marks has not been identified. Whether the reported differences in the soil and plants require an unusual cause, or could follow from ordinary variation and handling, is disputed among the scientists who have looked at the data. The object itself was never identified.",
    date_of_event: "1981-01-08",
    date_precision: "day",
    location_name: "Trans-en-Provence, Var",
    continent: "europe",
    country: "France",
    location_unknown: false,
    classification: "acknowledged",
    classification_reason:
      "An official government unit investigated the case, published its file, and classified it as unexplained.",
    view_count: 0,
    published: true,
    media: [],
    documents: [
      {
        id: "d-tep-1",
        title: "GEIPAN case archive",
        source_url: "https://www.geipan.fr/",
        source_note:
          "The public searchable archive of France's official UAP investigation unit, part of CNES.",
      },
    ],
    sources: [
      {
        id: "s-tep-1",
        source_name: "GEIPAN (CNES)",
        source_url: "https://www.geipan.fr/",
        source_type: "govt",
      },
    ],
    tags: [
      { id: "t-official-file", name: "Official file", slug: "official-file" },
      { id: "t-landing", name: "Reported landing trace", slug: "landing-trace" },
      { id: "t-single-witness", name: "Single witness", slug: "single-witness" },
    ],
  },

  {
    id: "c-tehran",
    title: "Iranian Air Force jets scramble over Tehran and report instrument failures",
    slug: "tehran-1976",
    summary:
      "Two F-4 crews were sent up after reports of a bright object over the capital. A US Defense Intelligence Agency report describing the night was later declassified.",
    body_footage:
      "No footage exists. The primary record is a US Defense Intelligence Agency document written days afterwards, drawing on Iranian Air Force accounts. It describes two F-4 Phantoms scrambled in sequence, each reporting the loss of instrumentation and communications as it closed on a bright object, with function returning as the aircraft turned away. The document records that the object was visible to observers on the ground and was tracked on airborne radar.",
    body_testimony:
      "General Yousefi, the deputy commander who ordered the intercepts, is named in the report as having looked at the object himself before scrambling the second aircraft. Lieutenant Parviz Jafari, who flew the second F-4, later described the encounter publicly and stated his weapons and communications went dead as he attempted to engage. The pilot of the first aircraft reported the same pattern of failure. The report attributes these accounts to the aircrew rather than asserting them.",
    body_status:
      "The DIA document was declassified and is held in US government archives, which is why the case rests on an official record rather than recollection alone. The report's evaluation section rated the reporting as high quality. No government has offered an identification of the object. Astronomical explanations have been proposed by later analysts, chiefly a bright planet combined with a meteor and equipment faults, but no official body has adopted one.",
    body_unknown:
      "The object was never identified. The aircraft were not examined afterwards in any record that has been released, so whether the reported instrument failures had a technical cause is unknown. Iranian records of the night have not been made public. The account of both aircraft failing in the same way rests on the crews' statements as relayed in the report.",
    date_of_event: "1976-09-19",
    date_precision: "day",
    location_name: "Tehran",
    continent: "asia",
    country: "Iran",
    location_unknown: false,
    classification: "acknowledged",
    classification_reason:
      "A declassified US government intelligence report documents the encounter and offers no conventional explanation.",
    view_count: 0,
    published: true,
    media: [],
    documents: [
      {
        id: "d-tehran-1",
        title: "US National Archives catalog",
        source_url: "https://catalog.archives.gov/",
        source_note:
          "Searchable catalog holding declassified US intelligence and Air Force UFO material.",
      },
    ],
    sources: [
      {
        id: "s-tehran-1",
        source_name: "U.S. Defense Intelligence Agency (declassified report)",
        source_type: "govt",
      },
      {
        id: "s-tehran-2",
        source_name: "U.S. National Archives",
        source_url: "https://catalog.archives.gov/",
        source_type: "govt",
      },
    ],
    tags: [
      { id: "t-military", name: "Military witnesses", slug: "military-witnesses" },
      { id: "t-radar", name: "Radar data", slug: "radar-data" },
      { id: "t-official-file", name: "Official file", slug: "official-file" },
    ],
  },

  // -------------------------------------------------------------------------
  // Unverified
  // -------------------------------------------------------------------------
  {
    id: "c-varginha",
    title: "Residents of Varginha report a creature and a heavy military presence",
    slug: "varginha-1996",
    summary:
      "Three young women said they saw an unfamiliar figure in a vacant lot. Claims of a military recovery operation followed, and Brazilian authorities have never confirmed one took place.",
    body_footage:
      "No footage of the reported creature exists. The record consists of witness statements gathered by researchers and journalists in the weeks afterwards, together with later interviews. Photographs circulated at the time show the vacant lot and the streets involved, not the reported figure.",
    body_testimony:
      "Three young women, sisters Liliane and Valquíria Silva and their friend Kátia Xavier, said they came across a crouching figure of roughly human height in a vacant lot and ran from it. Their accounts have remained broadly consistent in the decades since. Other residents reported seeing military vehicles moving through the town. A firefighter and several soldiers have been quoted by researchers as describing a capture operation, though the sourcing for those claims varies in quality and some rest on second-hand relay. Brazilian military authorities have denied that any such operation occurred.",
    body_status:
      "No Brazilian government body has confirmed a recovery operation, and no official file corresponding to the claims has been released. Researchers have pursued the case for decades and produced witness testimony, but no physical evidence, no photograph of the reported figure, and no document has entered the public record. A conventional explanation has been proposed, that the women encountered a person who was unwell or disoriented; it has not been established either.",
    body_unknown:
      "What the three women saw has not been determined. Whether any military operation took place is unresolved, and rests entirely on testimony that Brazilian authorities dispute. No physical evidence exists. Several widely repeated details of the story, including claimed hospital involvement and a claimed death, trace to second-hand accounts rather than documents, and should not be treated as established.",
    date_of_event: "1996-01-20",
    date_precision: "day",
    location_name: "Varginha, Minas Gerais",
    continent: "south_america",
    country: "Brazil",
    location_unknown: false,
    classification: "unverified",
    classification_reason:
      "Multiple named witnesses, but no official validation, no document, and no physical evidence.",
    view_count: 0,
    published: true,
    media: [],
    documents: [],
    sources: [
      {
        id: "s-varginha-1",
        source_name: "Witness accounts gathered by researchers and press",
        source_type: "witness",
      },
    ],
    tags: [
      { id: "t-multiple-witness", name: "Multiple witnesses", slug: "multiple-witnesses" },
      { id: "t-disputed-official", name: "Disputed official response", slug: "disputed-official-response" },
    ],
  },

  {
    id: "c-ariel-school",
    title: "Schoolchildren in Ruwa describe an object and a figure during morning break",
    slug: "ariel-school-1994",
    summary:
      "Dozens of pupils at a school outside Harare said they saw a craft land near the playground. They were interviewed within days, on camera, by researchers including a Harvard psychiatrist.",
    body_footage:
      "There is no footage of the reported object. What exists is filmed interview material recorded days afterwards, in which children aged roughly six to twelve describe what they say they saw and produce drawings of it. The drawings are broadly similar to one another in showing a landed object and a small figure, and they differ in detail.",
    body_testimony:
      "Around sixty children reported seeing an object come down near the edge of the school grounds during morning break, and some described a figure near it. The teachers were indoors and did not witness the event. Cynthia Hind, a Zimbabwean researcher, interviewed the children first. John Mack, then a professor of psychiatry at Harvard, travelled to the school and conducted filmed interviews, and said afterwards that he found the children's accounts consistent and their affect sincere. He did not claim this established what they saw. Several of the witnesses, now adults, have repeated their accounts on camera and have not retracted them.",
    body_status:
      "No official body investigated. There is no physical evidence, no photograph, and no instrument data. The strength of the case rests entirely on the number of witnesses, their age, and how soon they were interviewed. Critics have noted that the children were interviewed in groups and after discussing the event among themselves, which can shape recollection, and that the interviewers were sympathetic to the possibility of a genuine encounter. Supporters note the interviews began within days and that the accounts have held for thirty years.",
    body_unknown:
      "What the children saw has not been established. No adult witnessed it. The absence of any physical trace or image means the case cannot be independently checked, and it will likely remain testimony alone. How much the group setting of the interviews influenced the accounts is not resolvable now.",
    date_of_event: "1994-09-16",
    date_precision: "day",
    location_name: "Ariel School, Ruwa",
    continent: "africa",
    country: "Zimbabwe",
    location_unknown: false,
    classification: "unverified",
    classification_reason:
      "A large number of consistent witnesses interviewed promptly, but no official validation and no physical evidence.",
    view_count: 0,
    published: true,
    media: [],
    documents: [],
    sources: [
      {
        id: "s-ariel-1",
        source_name: "Filmed witness interviews, 1994",
        source_type: "witness",
      },
    ],
    tags: [
      { id: "t-multiple-witness", name: "Multiple witnesses", slug: "multiple-witnesses" },
      { id: "t-child-witness", name: "Child witnesses", slug: "child-witnesses" },
    ],
  },

  {
    id: "c-westall",
    title: "Students and staff at two Melbourne schools report an object landing in a paddock",
    slug: "westall-1966",
    summary:
      "Around two hundred people at Westall High School said they watched an object descend near the school grounds in daylight. No official investigation file has ever been produced.",
    body_footage:
      "No footage or photograph is known to survive. Witnesses have said film was taken and confiscated, but no such material has surfaced and the claim rests on recollection. The record is testimony, collected in part at the time by local press and more thoroughly in the decades since.",
    body_testimony:
      "Students and several teachers described a grey object, described by many as disc-shaped, that descended beyond a fence line into an adjacent paddock, remained briefly, then rose and left at speed. Some witnesses reported light aircraft in the area at the same time. Accounts differ on how many objects there were and on how long it stayed. Witnesses have also said they were instructed afterwards not to discuss the event, which they have described consistently across independent interviews.",
    body_status:
      "No Australian government file on the event has been released, and inquiries by researchers have not produced one. There is no radar data and no physical evidence. Proposed conventional explanations have included a research balloon operating in the area at the time; that explanation is contested by witnesses on the grounds of the object's reported movement, and it has not been officially adopted or ruled out.",
    body_unknown:
      "What was seen has not been identified. No official record has been located, so whether one was made is itself unknown. Claims that film was taken and confiscated cannot be checked. The number of objects and the duration of the event vary between accounts.",
    date_of_event: "1966-04-06",
    date_precision: "day",
    location_name: "Westall, Melbourne, Victoria",
    continent: "oceania",
    country: "Australia",
    location_unknown: false,
    classification: "unverified",
    classification_reason:
      "A large group of daytime witnesses, but no official file, no imagery, and no instrument data.",
    view_count: 0,
    published: true,
    media: [],
    documents: [],
    sources: [
      {
        id: "s-westall-1",
        source_name: "Witness accounts and contemporary local press",
        source_type: "witness",
      },
    ],
    tags: [
      { id: "t-multiple-witness", name: "Multiple witnesses", slug: "multiple-witnesses" },
      { id: "t-daylight", name: "Daylight sighting", slug: "daylight-sighting" },
    ],
  },

  // -------------------------------------------------------------------------
  // Likely explained
  // -------------------------------------------------------------------------
  {
    id: "c-phoenix-lights",
    title: "Two separate events over Arizona are reported as one, and only one has an explanation",
    slug: "phoenix-lights-1997",
    summary:
      "Thousands of people reported lights over Arizona on a single evening. The later set was identified as military flares. The earlier formation was not.",
    body_footage:
      "Several videos exist, most of them recording the later event: a row of bright lights hanging in the sky south of Phoenix, appearing in sequence and fading in sequence over several minutes. The earlier event, a formation of lights reported moving across the state, is far less well recorded and the footage attributed to it is limited and contested.",
    body_testimony:
      "Witnesses across Arizona reported a large V-shaped formation of lights travelling south during the earlier event, with many describing it as a single silent object rather than separate lights. Fife Symington, the state governor at the time, publicly ridiculed the reports that year and then, a decade later, said that he had seen the formation himself and could not identify it. For the later event, witnesses described a stationary row of lights, which is consistent with what the videos show.",
    body_status:
      "The Maryland Air National Guard confirmed that A-10 aircraft dropped illumination flares over the Barry M. Goldwater Range on that evening, which accounts for the timing, position, and behaviour of the later lights. That identification is well supported and widely accepted, including by many researchers who remain interested in the earlier event. No agency has offered an identification for the earlier formation. Investigators have proposed that it was a group of aircraft flying in formation, which would explain the lights but is disputed by witnesses who describe an unbroken object between them.",
    body_unknown:
      "The earlier formation has no established explanation. Because the two events happened the same evening and were reported together, the flare identification is often applied to both, which the evidence does not support. What the earlier witnesses saw, and whether the lights were separate craft or one object, has not been resolved.",
    date_of_event: "1997-03-13",
    date_precision: "day",
    location_name: "Phoenix and across Arizona",
    continent: "north_america",
    country: "United States",
    location_unknown: false,
    classification: "likely_explained",
    classification_reason:
      "The widely filmed later event is accounted for by confirmed military flare drops. The earlier formation is not explained, and the label reflects the material most people have seen.",
    view_count: 0,
    published: true,
    media: [],
    documents: [],
    sources: [
      {
        id: "s-phoenix-1",
        source_name: "Maryland Air National Guard statements",
        source_type: "govt",
      },
      {
        id: "s-phoenix-2",
        source_name: "Contemporary witness accounts and video",
        source_type: "witness",
      },
    ],
    tags: [
      { id: "t-mass-sighting", name: "Mass sighting", slug: "mass-sighting" },
      { id: "t-flares", name: "Flares", slug: "flares" },
    ],
  },

  // -------------------------------------------------------------------------
  // Debunked
  // -------------------------------------------------------------------------
  {
    id: "c-petit-rechain",
    title: "The photograph that defined Belgium's UFO wave was staged by the man who took it",
    slug: "petit-rechain-1990",
    summary:
      "A photograph of a black triangle with four lights became the emblem of the Belgian wave. Two decades later the photographer said he had made it with polystyrene and paint.",
    body_footage:
      "The image shows a dark triangular shape against a night sky, with three bright lights at its corners and one at its centre. It was analysed repeatedly over twenty years, and several of those analyses reported features that were said to be difficult to fake, including apparent variation in the light sources.",
    body_testimony:
      "In 2011 the photographer, who had remained anonymous and was known publicly as Patrick M., stated on Belgian television that he had made the object from a sheet of polystyrene, painted it, and lit it with lamps, and that he had done it as a joke that ran away from him. He said he had been surprised the image was taken seriously for so long. A second person subsequently supported the account.",
    body_status:
      "The photographer's admission is the direct evidence here, and it is not contested by the researchers who previously defended the image. Belgian UFO researchers who had promoted the photograph accepted the confession. The image should no longer be cited as evidence of anything.",
    body_unknown:
      "The confession settles the photograph and nothing beyond it. The wider Belgian wave of 1989 to 1990 involved separate reports, including gendarmerie witnesses and an F-16 radar encounter, which are not addressed by this admission and are not resolved by it. Treating the fake photograph as closing the whole wave would be as wrong as treating it as proving it.",
    date_of_event: "1990-04-04",
    date_precision: "day",
    location_name: "Petit-Rechain, Liège",
    continent: "europe",
    country: "Belgium",
    location_unknown: false,
    classification: "debunked",
    classification_reason:
      "The photographer publicly stated he fabricated the object and described how he did it.",
    view_count: 0,
    published: true,
    media: [],
    documents: [],
    sources: [
      {
        id: "s-petit-1",
        source_name: "Photographer's televised admission, RTL-TVI, 2011",
        source_type: "news",
      },
    ],
    tags: [
      { id: "t-hoax", name: "Confirmed hoax", slug: "confirmed-hoax" },
      { id: "t-photo", name: "Photograph", slug: "photograph" },
    ],
  },
];

/** Timestamps are filled in once so the seed does not carry noise. */
const SEEDED_AT = "2026-01-01T00:00:00.000Z";

export const SEED_CASES: CaseRecord[] = seed.map((c) => ({
  ...c,
  created_at: c.created_at ?? SEEDED_AT,
  updated_at: c.updated_at ?? SEEDED_AT,
}));
