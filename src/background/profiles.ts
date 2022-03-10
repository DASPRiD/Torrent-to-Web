import {browser} from 'webextension-polyfill-ts';
import {z} from 'zod';
import {clientNames} from './client';

const profileSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    client: z.enum(clientNames),
    url: z.string().url(),
    username: z.string(),
    password: z.string(),
    autostart: z.boolean(),
    handleLeftClick: z.boolean(),
});

const profilesSchema = profileSchema.array();

export type Profile = z.infer<typeof profileSchema>;

export const getProfiles = async () : Promise<Profile[]> => {
    const storage = await browser.storage.local.get('profiles');

    if (!Array.isArray(storage.profiles)) {
        return [];
    }

    return profilesSchema.parse(storage.profiles);
};
