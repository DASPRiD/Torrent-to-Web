import { z } from "zod";
import { clientNames } from "./client";

const profileSchema = z.object({
    id: z.int().positive(),
    name: z.string(),
    client: z.enum(clientNames),
    url: z.url(),
    username: z.string(),
    password: z.string(),
    autostart: z.boolean(),
    handleLeftClick: z.boolean(),
    labels: z.string().array().default([]),
});

const profilesSchema = profileSchema.array();

export type Profile = z.infer<typeof profileSchema>;

export const hasLeftClickProfile = async (): Promise<boolean> => {
    const profiles = await getProfiles();
    return profiles.some((profile) => profile.handleLeftClick);
};

export const getProfiles = async (): Promise<Profile[]> => {
    const storage = await browser.storage.local.get("profiles");

    if (!Array.isArray(storage.profiles)) {
        return [];
    }

    return profilesSchema.parse(storage.profiles);
};
