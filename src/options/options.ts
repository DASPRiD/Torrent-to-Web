import {browser} from 'webextension-polyfill-ts';
import type {ClientName} from '../background/client';
import type {Profile} from '../background/profiles';

const form = document.querySelector('#form') as HTMLFormElement;
const profileSelect = document.querySelector('#profiles') as HTMLSelectElement;
const nameInput = document.querySelector('#name') as HTMLInputElement;
const clientSelect = document.querySelector('#client') as HTMLSelectElement;
const urlInput = document.querySelector('#url') as HTMLInputElement;
const usernameInput = document.querySelector('#username') as HTMLInputElement;
const passwordInput = document.querySelector('#password') as HTMLInputElement;
const handleLeftClickCheckbox = document.querySelector('#handleLeftClick') as HTMLInputElement;
const autostartCheckbox = document.querySelector('#autostart') as HTMLInputElement;
const testButton = document.querySelector('#test') as HTMLButtonElement;
const removeButton = document.querySelector('#remove') as HTMLButtonElement;
const passwordToggleButton = document.querySelector('#passwordToggle') as HTMLButtonElement;
const newButton = document.querySelector('#new') as HTMLButtonElement;

let profiles : Profile[] = [];
let currentProfile : Profile | undefined = undefined;

const loadProfiles = async () => {
    const storage = await browser.storage.local.get('profiles');
    profiles = (storage.profiles ?? []) as Profile[];

    profileSelect.length = 0;

    for (const profile of profiles) {
        profileSelect.add(new Option(profile.name, profile.id.toString()));
    }
};

const updateUsernameInput = () => {
    usernameInput.disabled = (clientSelect.value === 'deluge');
};

const selectProfile = (profileId : number | undefined) => {
    currentProfile = profileId ? profiles.find(profile => profile.id === profileId) : undefined;
    profileSelect.value = currentProfile ? currentProfile.id.toString() : '';
    form.classList.remove('was-validated');

    nameInput.focus();

    if (!currentProfile) {
        nameInput.value = '';
        clientSelect.value = clientSelect.options[0].value;
        urlInput.value = '';
        usernameInput.value = '';
        passwordInput.value = '';
        handleLeftClickCheckbox.checked = false;
        autostartCheckbox.checked = false;
        testButton.disabled = true;
        removeButton.disabled = true;
        updateUsernameInput();
        return;
    }

    nameInput.value = currentProfile.name;
    clientSelect.value = currentProfile.client;
    urlInput.value = currentProfile.url;
    usernameInput.value = currentProfile.username;
    passwordInput.value = currentProfile.password;
    handleLeftClickCheckbox.checked = currentProfile.handleLeftClick;
    autostartCheckbox.checked = currentProfile.autostart;
    testButton.disabled = false;
    removeButton.disabled = false;
};

loadProfiles().then(() => {
    selectProfile(profiles[0]?.id);
}).catch(error => {
    console.error(error);
});

profileSelect.addEventListener('change', () => {
    const profileId = parseInt(profileSelect.value, 10);
    selectProfile(profileId);
});

browser.storage.onChanged.addListener(() => {
    loadProfiles().then(() => {
        if (currentProfile) {
            selectProfile(currentProfile.id);
        }
    }).catch(error => {
        console.error(error);
    });
});

const getNewId = () : number => {
    let id = 1;

    for (const profile of profiles) {
        id = Math.max(id, profile.id + 1);
    }

    return id;
};

const saveProfiles = () => {
    browser.storage.local.set({profiles}).catch(error => {
        console.error(error);
    });
};

form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();

    nameInput.value = nameInput.value.trim();
    usernameInput.value = usernameInput.value.trim();

    const isValid = form.checkValidity();

    if (!isValid) {
        form.classList.add('was-validated');
        return;
    }

    const profile = {
        id: currentProfile?.id ?? getNewId(),
        name: nameInput.value,
        client: clientSelect.value as ClientName,
        url: urlInput.value,
        username: usernameInput.value,
        password: passwordInput.value,
        handleLeftClick: handleLeftClickCheckbox.checked,
        autostart: autostartCheckbox.checked,
    };

    if (currentProfile) {
        profiles = profiles.map(existingProfile => existingProfile.id === profile.id ? profile : existingProfile);
    } else {
        profiles.push(profile);
    }

    saveProfiles();
});

testButton.addEventListener('click', () => {
    if (!currentProfile) {
        return;
    }

    browser.runtime.sendMessage({test: currentProfile}).catch(error => {
        console.error(error);
    });
});

removeButton.addEventListener('click', () => {
    if (!currentProfile) {
        return;
    }

    profiles = profiles.filter(profile => profile.id !== currentProfile?.id);
    currentProfile = undefined;
    saveProfiles();
});

passwordToggleButton.addEventListener('click', () => {
    if (passwordInput.type === 'text') {
        passwordInput.type = 'password';
        passwordToggleButton.innerText = 'Show';
    } else {
        passwordInput.type = 'text';
        passwordToggleButton.innerText = 'Hide';
    }
});

newButton.addEventListener('click', () => {
    profileSelect.value = '';
    selectProfile(undefined);
});
