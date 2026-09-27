import "bootstrap/dist/css/bootstrap.min.css";
import type { ClientName } from "../../utils/client";
import { labelCapableClients } from "../../utils/client";

const form = document.querySelector("#form") as HTMLFormElement;
const profileSelect = document.querySelector("#profiles") as HTMLSelectElement;
const nameInput = document.querySelector("#name") as HTMLInputElement;
const clientSelect = document.querySelector("#client") as HTMLSelectElement;
const urlInput = document.querySelector("#url") as HTMLInputElement;
const usernameInput = document.querySelector("#username") as HTMLInputElement;
const passwordInput = document.querySelector("#password") as HTMLInputElement;
const handleLeftClickCheckbox = document.querySelector("#handleLeftClick") as HTMLInputElement;
const autostartCheckbox = document.querySelector("#autostart") as HTMLInputElement;
const labelsInput = document.querySelector("#labels") as HTMLInputElement;
const testButton = document.querySelector("#test") as HTMLButtonElement;
const removeButton = document.querySelector("#remove") as HTMLButtonElement;
const passwordToggleButton = document.querySelector("#passwordToggle") as HTMLButtonElement;
const newButton = document.querySelector("#new") as HTMLButtonElement;

let profiles: Profile[] = [];
let currentProfile: Profile | undefined;

const renderProfileOptions = () => {
    profileSelect.length = 0;

    for (const profile of profiles) {
        profileSelect.add(new Option(profile.name, profile.id.toString()));
    }
};

const loadProfiles = async () => {
    profiles = await getProfiles();
    renderProfileOptions();
};

const updateUsernameInput = () => {
    usernameInput.disabled = clientSelect.value === "deluge";
};

const updateLabelsInput = () => {
    labelsInput.disabled = !labelCapableClients.includes(clientSelect.value as ClientName);
};

const parseLabels = (value: string): string[] => {
    const seen = new Set<string>();

    return value
        .split(",")
        .map((label) => label.trim())
        .filter((label) => {
            if (label === "" || seen.has(label)) {
                return false;
            }

            seen.add(label);
            return true;
        });
};

clientSelect.addEventListener("change", () => {
    updateUsernameInput();
    updateLabelsInput();
});

const selectProfile = (profileId: number | undefined) => {
    currentProfile = profileId ? profiles.find((profile) => profile.id === profileId) : undefined;
    profileSelect.value = currentProfile ? currentProfile.id.toString() : "";
    form.classList.remove("was-validated");

    nameInput.focus();

    if (currentProfile) {
        nameInput.value = currentProfile.name;
        clientSelect.value = currentProfile.client;
        urlInput.value = currentProfile.url;
        usernameInput.value = currentProfile.username;
        passwordInput.value = currentProfile.password;
        handleLeftClickCheckbox.checked = currentProfile.handleLeftClick;
        autostartCheckbox.checked = currentProfile.autostart;
        labelsInput.value = currentProfile.labels.join(", ");
        testButton.disabled = false;
        removeButton.disabled = false;
    } else {
        nameInput.value = "";
        clientSelect.selectedIndex = 0;
        urlInput.value = "";
        usernameInput.value = "";
        passwordInput.value = "";
        handleLeftClickCheckbox.checked = false;
        autostartCheckbox.checked = false;
        labelsInput.value = "";
        testButton.disabled = true;
        removeButton.disabled = true;
    }

    // Assigning clientSelect.value does not raise a change event, so the username and labels
    // state has to be brought along by hand on both paths.
    updateUsernameInput();
    updateLabelsInput();
};

loadProfiles()
    .then(() => {
        selectProfile(profiles[0]?.id);
    })
    .catch((error) => {
        console.error(error);
    });

profileSelect.addEventListener("change", () => {
    const profileId = Number.parseInt(profileSelect.value, 10);
    selectProfile(profileId);
});

browser.storage.onChanged.addListener(() => {
    loadProfiles()
        .then(() => {
            if (currentProfile) {
                selectProfile(currentProfile.id);
            }
        })
        .catch((error) => {
            console.error(error);
        });
});

const getNewId = (): number => {
    let id = 1;

    for (const profile of profiles) {
        id = Math.max(id, profile.id + 1);
    }

    return id;
};

const saveProfiles = () => {
    browser.storage.local.set({ profiles }).catch((error) => {
        console.error(error);
    });
};

form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopPropagation();

    nameInput.value = nameInput.value.trim();
    usernameInput.value = usernameInput.value.trim();

    const isValid = form.checkValidity();

    if (!isValid) {
        form.classList.add("was-validated");
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
        labels: labelCapableClients.includes(clientSelect.value as ClientName)
            ? parseLabels(labelsInput.value)
            : [],
    };

    if (currentProfile) {
        profiles = profiles.map((existingProfile) =>
            existingProfile.id === profile.id ? profile : existingProfile,
        );
    } else {
        profiles.push(profile);
    }

    saveProfiles();
    renderProfileOptions();
    selectProfile(profile.id);
});

testButton.addEventListener("click", () => {
    if (!currentProfile) {
        return;
    }

    browser.runtime.sendMessage({ test: currentProfile }).catch((error) => {
        console.error(error);
    });
});

removeButton.addEventListener("click", () => {
    if (!currentProfile) {
        return;
    }

    const removedId = currentProfile.id;
    profiles = profiles.filter((profile) => profile.id !== removedId);

    saveProfiles();
    renderProfileOptions();
    selectProfile(undefined);
});

passwordToggleButton.addEventListener("click", () => {
    if (passwordInput.type === "text") {
        passwordInput.type = "password";
        passwordToggleButton.innerText = "Show";
    } else {
        passwordInput.type = "text";
        passwordToggleButton.innerText = "Hide";
    }
});

newButton.addEventListener("click", () => {
    profileSelect.value = "";
    selectProfile(undefined);
});
