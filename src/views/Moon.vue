<template>
    <div class="moon-calendar">
        <!-- Header Section -->
        <header class="calendar-header" v-if="localDate">
            <div class="date-display">
                <div class="date-info">
                    <h1 class="current-date">
                        {{ dateStore.arMonths[headerDate.m]?.Name || `...` }} {{ headerDate.d }}, {{ headerDate.y }}{{ getDateSuffix() }}
                    </h1>
                </div>
            </div>
            <div class="header-actions" v-if="isEditor">
                <div class="lock-toggle">
                    <ToggleSwitch 
                        v-model="dateLocked" 
                        @change="lockToggle"
                        :mtlSmbl="['lock', 'lock_open']" 
                    />
                    <span class="lock-label">{{ dateLocked ? 'Locked' : 'Editing' }}</span>
                </div>
            </div>
        </header>

        <!-- Main Calendar Content -->
        <div class="calendar-content" v-if="localDate">
            <!-- Constellation Info Card -->
            <section class="constellation-card">
                <div class="constellation-icon" v-if="currentZodiacByDate?.Image">
                    <div
                        class="constellation-image"
                        :style="{
                            backgroundImage: `url('${currentZodiacByDate.Image}')`,
                        }"
                        :title="zodiacName"
                    ></div>
                </div>
                <div class="constellation-info">
                    <p class="constellation-name">{{ zodiacName }}</p>
                    <div class="constellation-details">
                        <p>The {{ localOrdinalDate }}.</p>
                        <div v-if="equinoxState" class="equinox-state">
                            <span class="status-badge special">{{ equinoxState }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Moon Phase Card -->
            <section class="moon-phase-card">
                <Starfield :dateSeed="starfieldSeed" />
                <div class="moon-header">
                    <h3>Moon Phase</h3>
                    <div class="moon-controls">
                        <!-- Navigation Controls -->
                        <div class="date-navigation">
                            <button
                                @click="decDay"
                                :class="['nav-btn', { 'editor-active': !dateLocked }]"
                                :disabled="!canGoBackward"
                                title="Previous Day"
                            >
                                <span class="material-symbols-outlined">keyboard_arrow_left</span>
                            </button>
                            <button
                                @click="decMonth"
                                :class="['nav-btn', { 'editor-active': !dateLocked }]"
                                :disabled="!canGoBackward"
                                title="Previous Month"
                            >
                                <span class="material-symbols-outlined">keyboard_double_arrow_left</span>
                            </button>
                            <button
                                v-if="!isAtServerDate && dateLocked"
                                class="today-btn"
                                title="Return to Current Date"
                                @click="today"
                            >
                                <span class="material-symbols-outlined">today</span>
                            </button>
                            <button
                                @click="incMonth"
                                :class="['nav-btn', { 'editor-active': !dateLocked }]"
                                :disabled="!canGoForward"
                                title="Next Month"
                            >
                                <span class="material-symbols-outlined">keyboard_double_arrow_right</span>
                            </button>
                            <button
                                @click="incDay"
                                :class="['nav-btn', { 'editor-active': !dateLocked }]"
                                :disabled="!canGoForward"
                                title="Next Day"
                            >
                                <span class="material-symbols-outlined">keyboard_arrow_right</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Moon Display -->
                <div class="moon-display">
                    <div class="current-moon">
                        <!-- Current Moon Phase Image -->
                        <div
                            class="moon-image current"
                            :style="{
                                backgroundImage: `url(https://img.potp.org/moon/Moon${String(localDate.moon).padStart(2, '0')}.webp)`,
                            }"
                        ></div>
                    </div>

                    <!-- Moon State Info -->
                    <div v-if="moonState" class="moon-state-info">
                        <div class="moon-state" v-html="moonState"></div>
                    </div>
                </div>
            </section>

            <!-- AI Weather -->
            <section class="weather-card">
                <div class="weather-header">
                    <h3>
                        Weather
                        <span v-if="isEditor" class="toggle-btn" @click="aiWeatherExpanded = !aiWeatherExpanded">
                            <span class="material-symbols-outlined">{{ aiWeatherExpanded ? 'expand_less' : 'expand_more' }}</span>
                        </span>
                    </h3>
                </div>

                <div class="weather-content" v-show="isEditor ? aiWeatherExpanded : true">
                    <!-- Weather Generator Controls (DM only) -->
                    <div v-if="isEditor" class="weather-controls">
                        <div class="latitude-control">
                            <label>Latitude</label>
                            <div class="slider-container">
                                <span class="slider-label">90°N</span>
                                <input
                                    type="range"
                                    v-model.number="aiLatitude"
                                    min="-90"
                                    max="90"
                                    class="latitude-slider"
                                    orient="vertical"
                                />
                                <span class="slider-label">90°S</span>
                            </div>
                            <span class="latitude-value">{{ aiLatitude }}°</span>
                        </div>

                        <div class="weather-right-column">
                            <div class="weather-control-row">
                                <label>Environment</label>
                                <select v-model="aiEnvironment">
                                    <option v-for="env in aiAvailableEnvironments" :key="env.id" :value="env.id">
                                        {{ env.name }}
                                    </option>
                                </select>
                            </div>

                            <div class="weather-control-row">
                                <label>Additional Conditions</label>
                                <textarea
                                    v-model="aiConditions"
                                    placeholder="e.g., magical storm approaching, eclipse effects..."
                                    rows="2"
                                ></textarea>
                            </div>

                            <button
                                v-if="!isFreeRealm || !aiWeather"
                                class="weather-generate-btn"
                                @click="aiWeather ? regenerateAIWeather() : generateAIWeather()"
                                :disabled="aiLoading"
                            >
                                {{ aiLoading ? 'Generating...' : (aiWeather ? 'Regenerate' : 'Generate') }} Weather
                            </button>
                        </div>
                    </div>

                    <div v-if="aiError" class="weather-error">{{ aiError }}</div>

                    <div v-if="aiWeather" class="weather-output">
                        <!-- Severe Weather Alerts -->
                        <div class="severe-weather-alerts" v-if="aiWeatherAlerts.length > 0">
                            <div
                                v-for="(alert, index) in aiWeatherAlerts"
                                :key="index"
                                class="weather-alert"
                                :class="alert.type"
                            >
                                <span class="alert-icon" v-html="alert.icon"></span> {{ alert.text }}
                            </div>
                        </div>

                        <div class="weather-stats">
                            <div class="weather-stat-row">
                                <span class="weather-label">Conditions:</span>
                                <span class="weather-value">{{ aiWeather.conditions }}</span>
                            </div>
                            <div class="weather-stat-row">
                                <span class="weather-label">Temperature:</span>
                                <span class="weather-value">
                                    <template v-if="typeof aiWeather.temperature === 'object'">
                                        Hi: {{ aiWeather.temperature.high }}°C | Lo: {{ aiWeather.temperature.low }}°C
                                        <template v-if="aiWindChill !== null">
                                            <br><span class="wind-chill">Wind Chill: {{ aiWindChill }}°C</span>
                                        </template>
                                        <template v-if="aiHumidex !== null">
                                            <br><span class="humidex">Feels Like: {{ aiHumidex }}°C</span>
                                        </template>
                                    </template>
                                    <template v-else>{{ aiWeather.temperature }}</template>
                                </span>
                            </div>
                            <div class="weather-stat-row" v-if="aiWeather.humidity !== undefined && aiWeather.temperature?.high >= 20">
                                <span class="weather-label">Humidity:</span>
                                <span class="weather-value">{{ aiWeather.humidity }}%</span>
                            </div>
                            <div class="weather-stat-row">
                                <span class="weather-label">Precipitation:</span>
                                <span class="weather-value">{{ aiWeather.precipitation }}</span>
                            </div>
                            <div class="weather-stat-row">
                                <span class="weather-label">Wind:</span>
                                <span class="weather-value">
                                    <template v-if="typeof aiWeather.wind === 'object'">
                                        {{ aiWeather.wind.speed }} kph {{ aiWeather.wind.direction }}
                                    </template>
                                    <template v-else>{{ aiWeather.wind }}</template>
                                </span>
                            </div>
                        </div>
                        <p class="weather-description">{{ aiWeather.description }}</p>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';
import { useDateStore } from '@shared/stores/date';
import { useAIWeather } from '@shared/composables/useAIWeather';
import ToggleSwitch from '@shared/components/widgets/ToggleSwitch.vue';
import Starfield from '@shared/components/Starfield.vue';

const emits = defineEmits(['set-room']);

const dateStore = useDateStore();
const realmStore = useRealmStore();
const userStore = useUserStore();

// AI Weather
const {
    environment: aiEnvironment,
    latitude: aiLatitude,
    additionalConditions: aiConditions,
    weather: aiWeather,
    loading: aiLoading,
    error: aiError,
    generateWeather: generateAIWeather,
    regenerateWeather: regenerateAIWeather,
    onDateChange: onAIDateChange,
    availableEnvironments: aiAvailableEnvironments,
} = useAIWeather();

const aiWeatherExpanded = ref(localStorage.getItem('thegame-ai-weather-expanded') !== 'false');
const previousDate = ref(null);

const dateLocked = ref(true);
const serverDate = ref({ y: 298, m: 0, d: 1, moon: 0 });
const localDate = ref({ y: 298, m: 0, d: 1, moon: 0 });
const moonState = ref('');
const equinoxState = ref('');
const daysInYear = computed(() => dateStore.yearLength);

// const ordinalDOM = computed(() => dateStore.getOrdinalNumber(localDate.value.d));
const isEditor = computed(() => userStore.isDeity || realmStore.isRealmDM || realmStore.isOwner);
const isFreeRealm = computed(() => !realmStore.activeRealm?.SubscriptionPlan || realmStore.activeRealm.SubscriptionPlan === 'free');

// Computed properties for navigation button states
const canGoForward = computed(() => {
    if (!dateLocked.value) return true; // Can always go forward when editing
    
    // When locked, check if we're already at the server date
    const currentDays = getDaysSF(localDate.value);
    const serverDays = getDaysSF(serverDate.value);
    return currentDays < serverDays;
});

const canGoBackward = computed(() => {
    // Can always go backward unless we're at the beginning of time
    return !(localDate.value.d == 1 && localDate.value.m == 0 && localDate.value.y == 0);
});

const isAtServerDate = computed(() => {
    return localDate.value.d === serverDate.value.d &&
           localDate.value.m === serverDate.value.m &&
           localDate.value.y === serverDate.value.y;
});

// Header shows server date when locked, local date when editing
const headerDate = computed(() => dateLocked.value ? serverDate.value : localDate.value);

// Ordinal date based on the browsed (local) date
const localOrdinalDate = computed(() => {
    const suffix = realmStore.activeRealm?.DateSuffix?.Abbr || 'SF';
    const monthName = dateStore.arMonths[localDate.value.m]?.Name || '...';
    return `${dateStore.getOrdinalNumber(localDate.value.d)} day of ${monthName}, ${localDate.value.y}${suffix}`;
});

// Preload all moon images for smooth transitions
const preloadMoonImages = () => {
    const imagesToPreload = [];
    
    // Regular moon phases (0-26)
    for (let i = 0; i <= 26; i++) {
        imagesToPreload.push(`https://img.potp.org/moon/Moon${String(i).padStart(2, '0')}.webp`);
    }
    
    // Special moon phases
    const specialMoons = [96, 97, 98, 99]; // Blue, Super, Super Blood, Blood
    specialMoons.forEach(moonPhase => {
        imagesToPreload.push(`https://img.potp.org/moon/Moon${String(moonPhase).padStart(2, '0')}.webp`);
    });
    
    // Constellation images
    if (dateStore.arZodiac && dateStore.arZodiac.length > 0) {
        dateStore.arZodiac.forEach(zodiac => {
            imagesToPreload.push(`https://img.potp.org/moon/${zodiac.Name.toLowerCase()}.jpg`);
        });
    }
    
    // Preload all images in the background
    imagesToPreload.forEach(imageUrl => {
        const img = new Image();
        img.src = imageUrl;
        // Optional: Add load/error handlers for debugging
        // Silent load - remove console logs
        // img.onload = () => console.log(`✅ Preloaded: ${imageUrl}`);
        // img.onerror = () => console.warn(`❌ Failed to preload: ${imageUrl}`);
    });
    
    // Silent preload - console.log(`🌙 Started preloading ${imagesToPreload.length} moon images`);
};

onMounted(async () => {
    try {
        localDate.value = { ...dateStore.date };
        serverDate.value = { ...dateStore.date };
        previousDate.value = { y: dateStore.date.y, m: dateStore.date.m, d: dateStore.date.d };
        emits(`set-room`, `illusions`);

        // Start preloading images immediately
        preloadMoonImages();

        setTimeout(() => {
            emits(`set-room`, `moon`);
            setMoon();
        }, 1000);
    } catch (error) {
        console.error('error:', error);
    }
});

onBeforeUnmount(() => {
    // Reset room context when leaving the Moon view
    emits(`set-room`, null);
});

watch(() => localDate.value, (newVal, oldVal) => {
    // Only trigger setMoon if the date components (d, m, y) changed, not moon/zodiac
    if (!oldVal ||
        newVal.d !== oldVal.d ||
        newVal.m !== oldVal.m ||
        newVal.y !== oldVal.y) {
        setMoon(true);

        // Determine if moving forward (only auto-generate weather going forward)
        const isMovingForward = previousDate.value && (
            newVal.y > previousDate.value.y ||
            (newVal.y === previousDate.value.y && newVal.m > previousDate.value.m) ||
            (newVal.y === previousDate.value.y && newVal.m === previousDate.value.m && newVal.d > previousDate.value.d)
        );

        onAIDateChange({
            date: newVal,
            autoGenerate: !dateLocked.value && isMovingForward && aiWeatherExpanded.value,
            canGenerate: isEditor.value
        });

        previousDate.value = { y: newVal.y, m: newVal.m, d: newVal.d };
    }
});

watch(dateLocked, (newVal) => {
    if (!newVal) {
        writeDate();
    }
});

watch(aiWeatherExpanded, (newVal) => {
    localStorage.setItem('thegame-ai-weather-expanded', newVal ? 'true' : 'false');
});

// Watch for calendar changes (when realm with custom calendar loads)
watch(() => dateStore.arZodiac, () => {
    // Re-preload images when calendar data changes
    preloadMoonImages();
}, { deep: true });

const setMoon = (post = false) => {
    moonState.value = '';
    equinoxState.value = '';

    const daysSF = getDaysSF();
    const lunarCyclesSF = Math.floor(daysSF / 27);
    let intMoon = daysSF % 27;

    const bloodMoon = Boolean(
        (localDate.value.d == 12 || localDate.value.d == 13 || localDate.value.d == 14) &&
            intMoon == 14
    );
    const superMoon = Boolean(lunarCyclesSF % 14 == 0 && intMoon == 14);
    const blueMoon = Boolean(localDate.value.d > 27 && intMoon == 14);

    if (bloodMoon || superMoon || blueMoon) {
        if (bloodMoon && superMoon) {
            moonState.value = '<div>Super Blood Moon</div>';
            intMoon = 98;
        } else if (superMoon) {
            moonState.value = '<div>Super Moon</div>';
            intMoon = 97;
        } else if (bloodMoon) {
            moonState.value = '<div>Blood Moon</div>';
            intMoon = 99;
        }
        if (blueMoon) {
            if (intMoon < 97) {
                intMoon = 96;
                moonState.value = '<div>Blue Moon</div>';
            }
        }
    }
    // Update localDate with proper reactivity and ensure all required fields are present
    localDate.value = {
        ...localDate.value,
        moon: intMoon,
        zodiac: zodiacNameByDate.value || ''
    };

    if (intMoon == 7) {
        moonState.value += '<div>Waxing Quarter</div>';
    }
    if (intMoon == 21) {
        moonState.value += '<div>Waning Quarter</div>';
    }
    if (intMoon == 14) {
        moonState.value += '<div>Full Moon</div>';
    }

    // Calculate equinoxes based on day of year as a fraction of total year length
    // This works for any custom calendar with any number of days
    const currentDayOfYear = calculateDayOfYear(localDate.value);
    const yearLength = dateStore.yearLength;

    // Calculate target days for each equinox/solstice based on standard fractions
    // Vernal Equinox: ~21.9% through the year (March 21 = day 80 of 365)
    // Summer Solstice: ~47.1% through the year (June 21 = day 172 of 365)
    // Autumnal Equinox: ~72.9% through the year (Sept 22 = day 266 of 365)
    // Winter Solstice: ~97.3% through the year (Dec 21 = day 355 of 365)
    const vernalEquinoxDay = Math.round(yearLength * 0.219);
    const summerSolsticeDay = Math.round(yearLength * 0.471);
    const autumnalEquinoxDay = Math.round(yearLength * 0.729);
    const winterSolsticeDay = Math.round(yearLength * 0.973);

    // Check if current day is within +/- 1 day of any equinox/solstice
    if (Math.abs(currentDayOfYear - vernalEquinoxDay) <= 1) {
        equinoxState.value = 'Vernal Equinox';
    } else if (Math.abs(currentDayOfYear - summerSolsticeDay) <= 1) {
        equinoxState.value = 'Summer Solstice';
    } else if (Math.abs(currentDayOfYear - autumnalEquinoxDay) <= 1) {
        equinoxState.value = 'Autumnal Equinox';
    } else if (Math.abs(currentDayOfYear - winterSolsticeDay) <= 1) {
        equinoxState.value = 'Winter Solstice';
    }

    if (post && isEditor.value && !dateLocked.value) {
        writeDate();
    }
};

const today = () => {
    // Always set to the current server date
    localDate.value = { ...serverDate.value };
};

const getDateSuffix = () => {
    // Use the active realm's DateSuffix if available, otherwise fall back to default
    if (realmStore.activeRealm?.DateSuffix?.Abbr) {
        return realmStore.activeRealm.DateSuffix.Abbr;
    }
    return 'SF'; // Default fallback
};

const getDaysSF = (objDate = { ...localDate.value }) => {
    var daysSF = 0;
    var monthCounter = 0;
    daysSF = objDate.y * dateStore.yearLength;

    while (monthCounter < objDate.m) {
        daysSF += dateStore.arMonths[monthCounter].Days;
        monthCounter++;
    }
    daysSF += objDate.d;
    return daysSF;
};

const getDateFromDays = (totalDays) => {
    // Convert total days back to {y, m, d} format
    const years = Math.floor(totalDays / dateStore.yearLength);
    let remainingDays = totalDays - (years * dateStore.yearLength);

    let month = 0;
    while (month < dateStore.arMonths.length && remainingDays > dateStore.arMonths[month].Days) {
        remainingDays -= dateStore.arMonths[month].Days;
        month++;
    }

    // Ensure we don't exceed the number of months
    if (month >= dateStore.arMonths.length) {
        month = dateStore.arMonths.length - 1;
        remainingDays = dateStore.arMonths[month].Days;
    }

    // Ensure day is at least 1
    const day = Math.max(1, remainingDays);

    return {
        y: years,
        m: month,
        d: day
    };
};

const lockToggle = () => {
    // If the date is different from the server date, ask for confirmation
    if (
        (localDate.value.d !== serverDate.value.d ||
            localDate.value.m !== serverDate.value.m ||
            localDate.value.y !== serverDate.value.y) &&
        dateLocked.value
    ) {
        if (
            !confirm(
                `CAREFUL NOW!\nDo you want to change the actual date to:\n   ${dateStore.arMonths[localDate.value.m].name} ${localDate.value.d}, ${localDate.value.y}${getDateSuffix()}`
            )
        ) {
            // If the user cancels, don't change the date
            return;
        } else {
            writeDate();
        }
    }
    dateLocked.value = !dateLocked.value;
};

const decDay = () => {
    // Use computed property to check if we can go backward
    if (!canGoBackward.value) {
        return;
    }

    // Create a new date object instead of mutating directly
    let newDate = { ...localDate.value };

    if (newDate.d == 1) {
        // Going from first day of month to last day of previous month
        if (newDate.m == 0) {
            // Going from first month to last month of previous year
            newDate.m = dateStore.arMonths.length - 1;
            newDate.y--;
        } else {
            newDate.m--;
        }
        // Set day to last day of the new month
        newDate.d = dateStore.arMonths[newDate.m].Days;
    } else {
        newDate.d = newDate.d - 1;
    }

    // Apply the new date
    localDate.value = newDate;

    // Write to DB if unlocked
    if (!dateLocked.value) {
        writeDate();
    }
};

const incDay = () => {
    // Calculate the proposed new date
    let newDate = { ...localDate.value };
    if (newDate.d == dateStore.arMonths[newDate.m].Days) {
        newDate.d = 1;
        if (newDate.m == dateStore.arMonths.length - 1) {
            newDate.m = 0;
            newDate.y++;
        } else {
            newDate.m++;
        }
    } else {
        newDate.d++;
    }

    // If locked, check if the new date would exceed server date
    if (dateLocked.value) {
        const newDays = getDaysSF(newDate);
        const serverDays = getDaysSF(serverDate.value);

        if (newDays > serverDays) {
            // If we would go past server date, go to server date instead
            localDate.value = { ...serverDate.value };
            return;
        }
    }

    // Apply the new date
    localDate.value = newDate;

    // Write to DB if unlocked
    if (!dateLocked.value) {
        writeDate();
    }
};

const decMonth = () => {
    // Use computed property to check if we can go backward
    if (!canGoBackward.value) {
        return;
    }

    // Subtract 30 days from current date
    const currentDays = getDaysSF(localDate.value);
    const newDays = Math.max(1, currentDays - 30); // Ensure we don't go below day 1

    // Convert back to date object
    const newDate = getDateFromDays(newDays);

    // Apply the new date
    localDate.value = newDate;

    // Write to DB if unlocked
    if (!dateLocked.value) {
        writeDate();
    }
};

const incMonth = () => {
    // Add 30 days to current date
    const currentDays = getDaysSF(localDate.value);
    const newDays = currentDays + 30;

    // Convert back to date object
    const newDate = getDateFromDays(newDays);

    // If locked, check if the new date would exceed server date
    if (dateLocked.value) {
        const serverDays = getDaysSF(serverDate.value);

        if (newDays > serverDays) {
            // If we would go past server date, go to server date instead
            localDate.value = { ...serverDate.value };
            return;
        }
    }

    // Apply the new date
    localDate.value = newDate;

    // Write to DB if unlocked
    if (!dateLocked.value) {
        writeDate();
    }
};

const decYear = () => {
    // Use computed property to check if we can go backward
    if (!canGoBackward.value) {
        return;
    }

    // Create a new date object instead of mutating directly
    let newDate = { ...localDate.value };

    if (newDate.y > 0) {
        newDate.y--;
    }

    // Apply the new date
    localDate.value = newDate;

    // Write to DB if unlocked
    if (!dateLocked.value) {
        writeDate();
    }
};

const writeDate = async () => {
    if (isEditor.value && !dateLocked.value && 
        (localDate.value.d !== serverDate.value.d ||
        localDate.value.m !== serverDate.value.m ||
        localDate.value.y !== serverDate.value.y)
    ) {
        // Ensure we send a complete date object with all required fields
        const dateToSend = {
            d: localDate.value.d,
            m: localDate.value.m,
            y: localDate.value.y,
            moon: localDate.value.moon || 0,
            zodiac: localDate.value.zodiac || ''
        };
        console.log('Moon: Writing date to DB:', dateToSend);
        await dateStore.setDate(dateToSend);
        serverDate.value = { ...localDate.value };
        console.log('Moon: Date written successfully');
    } else {
        console.log('Moon: writeDate called but conditions not met', {
            isEditor: isEditor.value,
            dateLocked: dateLocked.value,
            dateChanged: (localDate.value.d !== serverDate.value.d ||
                         localDate.value.m !== serverDate.value.m ||
                         localDate.value.y !== serverDate.value.y),
            localDate: localDate.value,
            serverDate: serverDate.value
        });
    }
};

const calculateDayOfYear = (objDate = serverDate.value) => {
    return getDaysSF(objDate) % daysInYear.value;
};

const dayOfYear = computed(() => calculateDayOfYear());

// Full zodiac objects
const currentZodiac = computed(() => {
    // find the zodiac where the day of the year is less than or equal to the end property
    const zodiac = dateStore.arZodiac.find((z) => dayOfYear.value <= z.End);
    return zodiac || null;
});

const currentZodiacByDate = computed(() => {
    // find the zodiac where the day of the year is less than or equal to the end property
    const zodiac = dateStore.arZodiac.find(
        (z) => calculateDayOfYear(localDate.value) <= z.End
    );
    return zodiac || null;
});

// Zodiac names for display
const zodiacName = computed(() => currentZodiacByDate.value?.Name || '');

const zodiacNameByDate = computed(() => currentZodiacByDate.value?.Name || '');

const starfieldSeed = computed(() => {
    // Create a unique seed based on the current date
    // This will ensure the same date always generates the same starfield
    return getDaysSF(localDate.value);
});

// Wind chill calculation (for subzero temperatures)
const calculateWindChill = (tempC, windKph) => {
    if (tempC > 10 || windKph <= 4.8) return null;
    const windChill = 13.12 + 0.6215 * tempC - 11.37 * Math.pow(windKph, 0.16) + 0.3965 * tempC * Math.pow(windKph, 0.16);
    return Math.round(windChill);
};

const aiWindChill = computed(() => {
    if (!aiWeather.value) return null;
    const temp = aiWeather.value.temperature;
    const wind = aiWeather.value.wind;
    if (typeof temp !== 'object' || typeof wind !== 'object') return null;
    if (temp.low > 0) return null;
    return calculateWindChill(temp.low, wind.speed);
});

// Humidex calculation (for warm temperatures with humidity)
const calculateHumidex = (tempC, humidity) => {
    if (tempC < 20 || humidity < 40) return null;
    const dewPoint = tempC - ((100 - humidity) / 5);
    const e = 6.11 * Math.exp(5417.7530 * (1/273.16 - 1/(273.15 + dewPoint)));
    const humidex = tempC + 0.5555 * (e - 10);
    return Math.round(humidex);
};

const aiHumidex = computed(() => {
    if (!aiWeather.value) return null;
    const temp = aiWeather.value.temperature;
    const humidity = aiWeather.value.humidity;
    if (typeof temp !== 'object' || typeof humidity !== 'number') return null;
    if (temp.high < 20) return null;
    return calculateHumidex(temp.high, humidity);
});

// Severe weather detection
const aiWeatherAlerts = computed(() => {
    if (!aiWeather.value) return [];
    const alerts = [];
    const conditions = (aiWeather.value.conditions || '').toLowerCase();
    const wind = aiWeather.value.wind;
    const temp = aiWeather.value.temperature;

    let highTemp = null;
    let lowTemp = null;
    if (typeof temp === 'object' && temp !== null) {
        highTemp = temp.high;
        lowTemp = temp.low;
    }

    const windSpeed = typeof wind === 'object' && wind !== null ? wind.speed : null;

    if (conditions.includes('tornado') || conditions.includes('waterspout')) {
        alerts.push({
            type: 'tornado',
            icon: '&#9888;',
            text: conditions.includes('waterspout') || aiEnvironment.value === 'open ocean' ? 'WATERSPOUT WARNING' : 'TORNADO WARNING'
        });
    }
    if (conditions.includes('severe thunderstorm') || conditions.includes('severe storm')) {
        alerts.push({ type: 'severe-storm', icon: '&#9889;', text: 'SEVERE THUNDERSTORM' });
    }
    if (conditions.includes('blizzard')) {
        alerts.push({ type: 'blizzard', icon: '&#10052;', text: 'BLIZZARD WARNING' });
    }
    if (conditions.includes('ice storm')) {
        alerts.push({ type: 'ice-storm', icon: '&#10052;', text: 'ICE STORM WARNING' });
    }
    if (conditions.includes('heat wave') || conditions.includes('heatwave')) {
        alerts.push({ type: 'heat-wave', icon: '&#9728;', text: 'HEAT WAVE' });
    } else if (highTemp !== null && highTemp > 35) {
        alerts.push({ type: 'heat-warning', icon: '&#9728;', text: 'HEAT WARNING' });
    }
    if (conditions.includes('cold snap') || conditions.includes('cold wave')) {
        alerts.push({ type: 'cold-snap', icon: '&#10052;', text: 'COLD SNAP' });
    } else if (lowTemp !== null && lowTemp < -20) {
        alerts.push({ type: 'cold-warning', icon: '&#10052;', text: 'COLD WARNING' });
    }
    if (windSpeed !== null) {
        if (windSpeed > 69) {
            alerts.push({ type: 'severe-wind', icon: '&#127744;', text: 'SEVERE WIND' });
        } else if (windSpeed > 58) {
            alerts.push({ type: 'strong-wind', icon: '&#127744;', text: 'STRONG WIND' });
        }
    }
    return alerts;
});
</script>
<style scoped>
.moon-calendar {
  height: 100%;
  overflow-y: auto;
  padding: 2rem;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Header Section */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.date-display {
  flex: 1;
}

.date-info h1.current-date {
  margin: 0;
  font-size: 2rem;
  color: var(--theme-accent);
  font-weight: 600;
  font-family: 'Calistoga', cursive;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lock-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lock-label {
  color: var(--theme-accent);
  font-size: 0.9rem;
  font-weight: 500;
}

/* Main Content */
.calendar-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  flex: 1;
}

/* Constellation Card */
.constellation-card {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s ease;
}

.constellation-card:hover {
  border-color: var(--theme-accent);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.constellation-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.constellation-image {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 3px solid var(--theme-accent);
  box-shadow: 0 4px 15px color-mix(in srgb, var(--theme-accent) 30%, transparent);
  transition: transform 0.3s ease;
}

.constellation-image:hover {
  transform: scale(1.05);
}

.constellation-info h3 {
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1.3rem;
  font-weight: 600;
}

.constellation-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 1rem 0;
  text-transform: capitalize;
}

.constellation-details p {
  margin: 0 0 0.5rem 0;
  color: #ccc;
  line-height: 1.5;
}

.constellation-details strong {
  color: var(--theme-accent);
  text-transform: capitalize;
}

.equinox-state {
  margin-top: 1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.special {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

/* Moon Phase Card */
.moon-phase-card {
  position: relative;
  background: transparent;
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
  overflow: hidden;
}

.moon-phase-card:hover {
  border-color: var(--theme-accent);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.moon-header {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.moon-header h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.3rem;
  font-weight: 600;
}

/* Navigation Controls */
.date-navigation {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.nav-btn, .today-btn {
  background: linear-gradient(135deg, #2a3a5a 0%, #3a4a6a 100%);
  border: 1px solid #555;
  color: #ccc;
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.nav-btn:hover:not(:disabled), .today-btn:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
  transform: translateY(-1px);
  box-shadow: 0 3px 10px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-btn.editor-active {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-color: var(--theme-accent);
  color: var(--theme-bg-surface);
  animation: pulse 2s infinite;
}

.today-btn {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  border-color: #28a745;
  color: white;
  margin: 0 0.5rem;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--theme-accent) 70%, transparent); }
  50% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--theme-accent) 0%, transparent); }
}

/* Moon Display */
.moon-display {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.current-moon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.moon-image.current {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 3px solid var(--theme-accent);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--theme-accent) 40%, transparent);
  transition: all 0.3s ease;
}

.moon-image.current:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 25px color-mix(in srgb, var(--theme-accent) 60%, transparent);
}

/* Moon State Info */
.moon-state-info {
  background: linear-gradient(135deg, rgba(26, 31, 46, 0.9) 0%, rgba(37, 42, 62, 0.9) 100%);
  border: 1px solid #333;
  border-radius: 0.75rem;
  padding: 1rem;
  backdrop-filter: blur(2px);
}

.moon-state {
  color: var(--theme-accent);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}

.moon-state :deep(div) {
  margin: 0.5rem 0;
}

/* AI Weather Generator Card */
.weather-card {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.weather-card:hover {
  border-color: var(--theme-accent);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.weather-header h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.3rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  padding-bottom: 0.75rem;
}

.weather-header .toggle-btn {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  user-select: none;
  display: flex;
  align-items: center;
}

.weather-header .toggle-btn:hover {
  opacity: 1;
}

.weather-content {
  margin-top: 1rem;
}

.weather-controls {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.latitude-control {
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  gap: 0.3rem;
  align-self: stretch;
}

.latitude-control > label {
  font-size: 0.85rem;
  color: var(--theme-accent);
  margin-bottom: 0.3rem;
}

.slider-container {
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  gap: 0.2rem;
  height: 100%;
}

.slider-label {
  font-size: 0.7rem;
  color: #888;
}

.latitude-slider {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 20px;
  height: 100%;
  min-height: 80px;
  cursor: pointer;
  accent-color: var(--theme-accent);
}

.latitude-value {
  font-size: 0.9rem;
  color: #fff;
  font-weight: bold;
}

.weather-right-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.8rem;
}

.weather-control-row {
  display: flex;
  flex-direction: column;
}

.weather-control-row label {
  font-size: 0.85rem;
  color: var(--theme-accent);
  margin-bottom: 0.3rem;
}

.weather-control-row select {
  padding: 0.5rem 0.75rem;
  background: #0a0e1a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  text-transform: capitalize;
  transition: border-color 0.2s ease;
}

.weather-control-row select:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.weather-control-row textarea {
  padding: 0.5rem 0.75rem;
  background: #0a0e1a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  min-height: 40px;
  transition: border-color 0.2s ease;
}

.weather-control-row textarea:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.weather-control-row textarea::placeholder {
  color: #666;
}

.weather-generate-btn {
  width: 100%;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #2a3a5a 0%, #3a4a6a 100%);
  border: 1px solid var(--theme-accent);
  color: var(--theme-accent);
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.weather-generate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  transform: translateY(-1px);
  box-shadow: 0 3px 10px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.weather-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.weather-error {
  margin-top: 0.8rem;
  padding: 0.75rem;
  background: rgba(139, 0, 0, 0.2);
  border: 1px solid rgba(255, 75, 75, 0.4);
  border-radius: 0.5rem;
  color: #ff6b6b;
  font-size: 0.85rem;
}

.weather-output {
  margin-top: 1rem;
  background: rgba(0, 0, 0, 0.25);
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #333;
}

/* Severe Weather Alerts */
.severe-weather-alerts {
  margin-bottom: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.weather-alert {
  padding: 0.5rem 0.8rem;
  border-radius: 0.5rem;
  font-weight: bold;
  font-size: 0.85rem;
  text-align: center;
  animation: alertPulse 2s ease-in-out infinite;
}

.weather-alert .alert-icon {
  margin-right: 0.4rem;
}

.weather-alert.tornado {
  background: linear-gradient(135deg, #8b0000, #dc143c);
  color: #fff;
  border: 2px solid var(--theme-danger);
  animation: alertPulse 1s ease-in-out infinite;
}

.weather-alert.severe-storm {
  background: linear-gradient(135deg, #b22222, #ff6347);
  color: #fff;
  border: 2px solid #ff6347;
}

.weather-alert.blizzard {
  background: linear-gradient(135deg, #1a1a4e, #4169e1);
  color: #fff;
  border: 2px solid #87ceeb;
}

.weather-alert.ice-storm {
  background: linear-gradient(135deg, #2f4f4f, #5f9ea0);
  color: #fff;
  border: 2px solid #b0e0e6;
}

.weather-alert.heat-wave {
  background: linear-gradient(135deg, #ff4500, #ff8c00);
  color: #fff;
  border: 2px solid #ffd700;
}

.weather-alert.heat-warning {
  background: linear-gradient(135deg, #ff8c00, #ffa500);
  color: #fff;
  border: 2px solid #ffd700;
}

.weather-alert.cold-snap {
  background: linear-gradient(135deg, #191970, #4682b4);
  color: #fff;
  border: 2px solid #add8e6;
}

.weather-alert.cold-warning {
  background: linear-gradient(135deg, #4682b4, #5f9ea0);
  color: #fff;
  border: 2px solid #add8e6;
}

.weather-alert.severe-wind {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  color: #fff;
  border: 2px solid #deb887;
}

.weather-alert.strong-wind {
  background: linear-gradient(135deg, #a0522d, #cd853f);
  color: #fff;
  border: 2px solid #deb887;
}

@keyframes alertPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.weather-stats {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.weather-stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.25rem;
}

.weather-stat-row:last-child {
  border-bottom: none;
}

.weather-label {
  color: var(--theme-accent);
  font-size: 0.85rem;
}

.weather-value {
  color: #fff;
  font-size: 0.85rem;
  text-align: right;
  text-transform: capitalize;
}

.weather-value .wind-chill {
  color: #87ceeb;
  font-size: 0.95em;
}

.weather-value .humidex {
  color: #ffa07a;
  font-size: 0.95em;
}

.weather-description {
  margin: 0.8rem 0 0 0;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--theme-accent) 6%, transparent);
  border-left: 3px solid var(--theme-accent);
  border-radius: 0 0.5rem 0.5rem 0;
  font-style: italic;
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .moon-calendar {
    padding: 1rem;
    gap: 1rem;
  }

  .calendar-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
    padding: 1rem;
  }

  .date-info h1.current-date {
    font-size: 1.5rem;
  }

  .calendar-content {
    grid-template-columns: 1fr;
    gap: 1rem;
    display: flex;
    flex-direction: column;
  }

  /* Reorder sections on mobile - Moon Phase first, then Constellation */
  .constellation-card {
    order: 2;
  }

  .moon-phase-card {
    order: 1;
  }

  .weather-card {
    order: 3;
  }

  .constellation-image {
    width: 100px;
    height: 100px;
  }

  .moon-image.current {
    width: 240px;
    height: 240px;
  }

  .date-navigation {
    flex-wrap: wrap;
    justify-content: center;
  }

  .weather-controls {
    flex-direction: row;
  }

  .latitude-slider {
    min-height: 60px;
  }
}

@media (max-width: 480px) {
  .moon-image.current {
    width: 200px;
    height: 200px;
  }
}
</style>
