import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seeds three sample clients with posts and brand-voice profiles. The post
// externalIds line up with the mock provider's comment pool so "Sync now"
// produces realistic, on-brand comments to triage.

async function main() {
  const accounts = [
    {
      name: "Sunrise Cafe",
      platform: "instagram",
      handle: "sunrisecafe",
      postExternalId: "post_sunrise_1",
      caption: "Fresh bakes and single-origin pour-overs every morning ☕",
      voiceTone: "warm, playful, concise",
      voiceDos: "thank people, invite them back, use a coffee/food emoji",
      voiceDonts: "be stiff or corporate, over-apologize",
      bannedWords: "cheap, guys",
    },
    {
      name: "Northside Dental",
      platform: "facebook",
      handle: "NorthsideDental",
      postExternalId: "post_dental_1",
      caption: "Gentle, modern dentistry for the whole family. Now accepting new patients!",
      voiceTone: "reassuring, professional, friendly",
      voiceDos: "reassure nervous patients, offer to help via DM",
      voiceDonts: "give specific medical advice publicly, make guarantees",
      bannedWords: "painful, drill",
    },
    {
      name: "Trailhead Outfitters",
      platform: "instagram",
      handle: "trailheadoutfitters",
      postExternalId: "post_trail_1",
      caption: "Gear that goes the distance. New packs just dropped 🥾",
      voiceTone: "energetic, outdoorsy, encouraging",
      voiceDos: "celebrate adventures, answer gear questions helpfully",
      voiceDonts: "sound salesy, overpromise on stock",
      bannedWords: "",
    },
  ];

  for (const a of accounts) {
    const account = await prisma.account.create({
      data: {
        name: a.name,
        platform: a.platform,
        handle: a.handle,
        voiceTone: a.voiceTone,
        voiceDos: a.voiceDos,
        voiceDonts: a.voiceDonts,
        bannedWords: a.bannedWords || null,
        autoLike: true,
        autoHideSpam: true,
      },
    });
    await prisma.post.create({
      data: {
        accountId: account.id,
        externalId: a.postExternalId,
        caption: a.caption,
        permalink: `https://example.com/${a.handle}/p/1`,
      },
    });
    console.log(`Seeded ${a.name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
