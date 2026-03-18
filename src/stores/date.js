import { defineStore } from 'pinia';
import { useRealmStore } from './realm';

export const useDateStore = defineStore('date', {
    state: () => ({
        // Default calendar configuration (fallback)
        defaultZodiac: [
            { "Name": 'Aries', "End": 20 }, { "Name": 'Taurus', "End": 51 },
            { "Name": 'Gemini', "End": 82 }, { "Name": 'Cancer', "End": 113 },
            { "Name": 'Leo', "End": 143 }, { "Name": 'Virgo', "End": 176 },
            { "Name": 'Libra', "End": 206 }, { "Name": 'Scorpio', "End": 236 },
            { "Name": 'Sagittarius', "End": 266 }, { "Name": 'Capricorn', "End": 295 },
            { "Name": 'Aquarius', "End": 326 }, { "Name": 'Pisces', "End": 356 },
            { "Name": 'Aries', "End": 365 },
        ],
        defaultMonths: [
            { "Name": 'Midspring', "Abbr": 'MSP', "Days": 30, "Img": 'https://img.potp.org/icons/months/midspring.png'},
            { "Name": 'Springwane', "Abbr": 'SPW', "Days": 31, "Img": 'https://img.potp.org/icons/months/springwane.png'},
            { "Name": 'Summer', "Abbr": 'SMR', "Days": 30, "Img": 'https://img.potp.org/icons/months/summer.png'},
            { "Name": 'Midsummer', "Abbr": 'MSR', "Days": 31, "Img": 'https://img.potp.org/icons/months/midsummer.png'},
            { "Name": 'Summerwane', "Abbr": 'SRW', "Days": 31, "Img": 'https://img.potp.org/icons/months/summerwane.png'},
            { "Name": 'Fall', "Abbr": 'FAL', "Days": 30, "Img": 'https://img.potp.org/icons/months/fall.png'},
            { "Name": 'Midfall', "Abbr": 'MFL', "Days": 31, "Img": 'https://img.potp.org/icons/months/midfall.png'},
            { "Name": 'Fallwane', "Abbr": 'FLW', "Days": 30, "Img": 'https://img.potp.org/icons/months/fallwane.png'},
            { "Name": 'Winter', "Abbr": 'WTR', "Days": 31, "Img": 'https://img.potp.org/icons/months/winter.png'},
            { "Name": 'Midwinter', "Abbr": 'MWR', "Days": 31, "Img": 'https://img.potp.org/icons/months/midwinter.png'},
            { "Name": 'Winterwane', "Abbr": 'WRW', "Days": 28, "Img": 'https://img.potp.org/icons/months/winterwane.png'},
            { "Name": 'Spring', "Abbr": 'SPR', "Days": 31, "Img": 'https://img.potp.org/icons/months/spring.png'},
        ],
        date: {
            d: 1,
            m: 0,
            y: 1,
            moon: 0,
            zodiac: "",
        },
        loaded: false,
    }),
    getters: {
        // Get current calendar (realm-specific or default fallback)
        arZodiac(state) {
            const realmStore = useRealmStore();
            return realmStore.activeRealm?.Calendar?.Zodiac || state.defaultZodiac;
        },
        arMonths(state) {
            const realmStore = useRealmStore();
            return realmStore.activeRealm?.Calendar?.Months || state.defaultMonths;
        },
        strDate(state) {
            const realmStore = useRealmStore();
            const suffix = realmStore.activeRealm?.DateSuffix?.Abbr || 'SF';
            return `${this.arMonths[state.date.m].Name} ${state.date.d}, ${state.date.y}${suffix}`;
        },
        yearLength() {
            return this.arMonths.reduce((acc, month) => acc + month.Days, 0);
        },
        ordinalDate() {
            const realmStore = useRealmStore();
            const suffix = realmStore.activeRealm?.DateSuffix?.Abbr || 'SF';
            return `${this.getOrdinalNumber(this.date.d)} day of ${this.arMonths[this.date.m].Name}, ${this.date.y}${suffix}`;
        },
    },
    actions: {
        async setDate(date = this.date) {
            let hasMatch = false;
            for (const key in date) {
                if (Object.prototype.hasOwnProperty.call(this.date, key)) {
                    hasMatch = true;
                    this.date[key] = date[key];
                }
            }
            if (hasMatch) {
                console.log('setting date', this.date);
                const result = await useRealmStore().setDate(this.date);
                return result;
            }
            return this.date;
        },
        getOrdinalNumber(number) {
            if (isNaN(number)) {
                return number; // Return input as-is if it's not a valid number
            } else {
                number = Number(number); // Explicitly convert input to a number
            }
        
            // Handle special cases for 11th, 12th, and 13th
            if (number % 100 >= 11 && number % 100 <= 13) {
                return number + 'th';
            }
        
            // Determine the suffix based on the last digit
            const lastDigit = number % 10;
            switch (lastDigit) {
                case 1:
                    return number + 'st';
                case 2:
                    return number + 'nd';
                case 3:
                    return number + 'rd';
                default:
                    return number + 'th';
            }
        },

    },
});