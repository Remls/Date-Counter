let holidays = {}
fetch('./assets/data/holidays.json')
    .then((response) => response.json())
    .then((data) => holidays = data);

document.addEventListener('alpine:init', () => {
    Alpine.store('presets', {
        data: {},
        dataAsArray: [],

        init() {
            fetch('./assets/data/presets.json')
                .then((response) => response.json())
                .then((data) => {
                    this.data = data;
                    this.dataAsArray = Object.keys(data).map(key => ({ key, ...data[key] }));
                });
        },

        get(key) {
            return this.data[key];
        }
    });

    Alpine.data('dateCounter', () => ({
        startDate: null,
        daysToCount: 60,
        skipWeekends: true,
        skipHolidays: true,
        includeStartDate: false,
        includeEndDate: false,
        selectedPreset: null,
        output: [],
        error: null,

        isValid() {
            this.output = [];
            this.error = null;
            if (!this.startDate) {
                this.error = "Please select a start date.";
                return false;
            }
            if (!this.daysToCount) {
                this.error = "Please select number of days to count.";
                return false;
            }
            if (this.getDaysToCount() < 0) {
                this.error = "Days to count must be a positive integer.";
                return false;
            }
            if (this.getDaysToCount() > 1000) {
                this.error = "Days to count must be less than 1000.";
                return false;
            }
            return true;
        },

        getDaysToCount() {
            return Number(this.daysToCount);
        },

        selectPreset(key) {
            this.selectedPreset = key;
            const preset = this.$store.presets.get(key);
            [
                'daysToCount',
                'skipWeekends',
                'skipHolidays',
                'includeStartDate',
                'includeEndDate',
            ].forEach(prop => {
                this[prop] = preset[prop];
            });
        },

        toggle(v) {
            this[v] = !this[v];
            this.clearOutput(true);
        },

        clearOutput(alsoChangePreset = false) {
            if (alsoChangePreset) {
                this.selectedPreset = null;
            }
            this.output = [];
            this.error = null;
        },
        
        recompute() {
            if (!this.isValid()) return;

            let dateToDisplay = luxon.DateTime.fromISO(this.startDate);
            let textToDisplay = 'start';
            let counter = 1;
            if (this.includeStartDate) {
                textToDisplay = '1 (start)';
                counter = 2;
            }
            let endCountAt = this.getDaysToCount() + 1;
            if (this.includeEndDate) endCountAt = this.getDaysToCount();
            this.output.push({ date: dateToDisplay, text: textToDisplay });
            while (counter <= endCountAt) {
                let skipThisDate = false;
                textToDisplay = counter;

                dateToDisplay = dateToDisplay.plus({ days: 1 });

                if (this.skipWeekends) {
                    if (dateToDisplay.weekday === 5 || dateToDisplay.weekday === 6) {
                        skipThisDate = true;
                        textToDisplay = 'skipped because weekend';
                    }
                }

                if (this.skipHolidays) {
                    const dateKey = dateToDisplay.toFormat('yyyy-MM-dd');
                    if (dateKey in holidays) {
                        const holiday = holidays[dateKey];
                        skipThisDate = true;
                        textToDisplay = `skipped because holiday (${holiday})`;
                    }
                }

                this.output.push({ date: dateToDisplay, skip: skipThisDate, text: textToDisplay });
                if (!skipThisDate) counter++;
            }
            if (this.includeEndDate) {
                this.output[this.output.length-1].text += ' (end)';
            } else {
                this.output[this.output.length-1].text = 'end';
            }
        }
    }));
});
