<template>
  <div class="realm-create" v-if="userStore.loaded">
    <div class="create-container">
      <h2 class="create-header">
        <span>Create New Realm</span>
        <span class="header-actions">
          <button @click="cancel" class="btn-cancel" title="Cancel">
            <span class="material-symbols-outlined">cancel</span>
          </button>
        </span>
      </h2>

      <!-- Realm Limit Warning -->
      <div v-if="hasReachedRealmLimit" class="realm-limit-warning">
        <div class="warning-icon">
          <span class="material-symbols-outlined">warning</span>
        </div>
        <div class="warning-content">
          <h3>Realm Limit Reached</h3>
          <p>You've reached your realm limit for this gaming system ({{ gamingSystemFreeRealms }} realm{{ gamingSystemFreeRealms > 1 ? 's' : '' }}). To create additional realms, please upgrade your account.</p>
          <button @click="cancel" class="btn btn-primary">
            <span class="material-symbols-outlined">arrow_back</span>
            Return to Account
          </button>
        </div>
      </div>

      <div v-else class="realm-create-content">
        <!-- Progress Indicator -->
        <div class="step-indicator">
          <div
            v-for="step in totalSteps"
            :key="step"
            class="step-item"
            :class="{
              active: currentStep === step,
              completed: currentStep > step
            }"
          >
            <div class="step-number">{{ step }}</div>
            <div class="step-label">{{ getStepLabel(step) }}</div>
          </div>
        </div>

        <div class="realm-create-form">
          <!-- Step 1: Realm Information -->
          <div v-show="currentStep === 1" class="form-step">
            <div class="form-section">
              <h3>Realm Information</h3>
              <div class="form-grid">
                <div class="form-field full-width">
                  <label for="realmName" title="Name">Name <span class="required">*</span></label>
                  <input
                    ref="elName"
                    autocomplete="off"
                    type="text"
                    id="realmName"
                    v-model="realmData.Name"
                    maxlength="64"
                    required
                    placeholder="Enter realm name..."
                  />
                </div>

                <div class="form-field full-width">
                  <label for="realmDescription" title="Description">Description <span class="required">*</span></label>
                  <div class="editor-container">
                    <Ckeditor
                      v-model="realmData.Description"
                      :editor="editor"
                      :config="editorConfig"
                    />
                  </div>
                  <small class="field-hint">Provide a rich description of your realm using the editor above</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Content Activation Step (only when hasShop) -->
          <div v-if="features.hasShop" v-show="currentStep === steps.content" class="form-step">
            <div class="form-section">
              <h3>Activate Content</h3>
              <p class="section-description">
                Select the purchased content to activate on this realm. These are items you've purchased from the shop.
                You can always purchase and add more content later.
              </p>

              <!-- Loading State -->
              <div v-if="loadingShopItems" class="shop-items-loading">
                <div class="loading-spinner"></div>
                <p>Loading available content...</p>
              </div>

              <!-- No Purchased Items -->
              <div v-else-if="purchasedShopItems.length === 0" class="no-purchased-items">
                <div class="empty-icon">
                  <span class="material-symbols-outlined">shopping_cart</span>
                </div>
                <h4>No Purchased Content</h4>
                <p>You haven't purchased any content for this gaming system yet.</p>
                <p>
                  Visit <a href="https://realmforge.io" target="_blank" rel="noopener noreferrer">realmforge.io</a> to explore available content.
                </p>
              </div>

              <!-- Shop Item Cards -->
              <div v-else class="shop-item-cards">
                <div
                  v-for="item in purchasedShopItems"
                  :key="item.ID"
                  class="shop-item-card"
                  :class="{ selected: isShopItemActivated(item.ID), locked: item.ID === realmForgeEssentialsId }"
                  @click="toggleShopItemActivation(item.ID)"
                >
                  <div class="card-icon">
                    <span class="material-symbols-outlined">{{ getShopItemIcon(item) }}</span>
                  </div>
                  <div class="card-content">
                    <h4>{{ item.Name }}</h4>
                    <div v-if="item.Description" class="card-description">{{ truncateText(item.Description, 100) }}</div>
                    <div class="card-tags">
                      <span v-for="tag in getItemTags(item)" :key="tag" class="item-tag">{{ tag }}</span>
                    </div>
                  </div>
                  <div class="card-toggle">
                    <span v-if="item.ID === realmForgeEssentialsId" class="material-symbols-outlined">lock</span>
                    <span v-else class="material-symbols-outlined">{{ isShopItemActivated(item.ID) ? 'toggle_on' : 'toggle_off' }}</span>
                  </div>
                </div>
              </div>

              <!-- Summary of Activated Items -->
              <div v-if="activatedShopItemIds.length > 0" class="activated-summary">
                <h4>Activated Content ({{ activatedShopItemIds.length }})</h4>
                <div class="activated-chips">
                  <span v-for="itemId in activatedShopItemIds" :key="itemId" class="activated-chip" :class="{ locked: itemId === realmForgeEssentialsId }">
                    {{ getShopItemName(itemId) }}
                    <button v-if="itemId !== realmForgeEssentialsId" @click.stop="toggleShopItemActivation(itemId)" class="remove-chip">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                    <span v-else class="material-symbols-outlined lock-icon">lock</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Calendar Configuration Step -->
          <div v-show="currentStep === steps.calendar" class="form-step">
            <div class="form-section">
              <h3>Calendar Configuration</h3>
              <p class="section-description">
                Choose your calendar system and customize month names. You can use the standard fantasy calendar, the Gregorian calendar, or create your own custom calendar.
              </p>

              <!-- Calendar Type Selection -->
              <div class="calendar-type-buttons">
                <button
                  type="button"
                  @click="resetCalendarToDefault"
                  class="btn-calendar-type"
                  :class="{ active: calendarSelected && isUsingDefaultCalendar }"
                >
                  <span class="material-symbols-outlined">calendar_month</span>
                  Use The Game Calendar
                </button>
                <button
                  type="button"
                  @click="setGregorianCalendar"
                  class="btn-calendar-type"
                  :class="{ active: calendarSelected && isUsingGregorianCalendar }"
                >
                  <span class="material-symbols-outlined">event</span>
                  Use Gregorian Calendar
                </button>
                <button
                  type="button"
                  @click="setGreyhawkCalendar"
                  class="btn-calendar-type"
                  :class="{ active: calendarSelected && isUsingGreyhawkCalendar }"
                >
                  <span class="material-symbols-outlined">castle</span>
                  Use Greyhawk Calendar
                </button>
                <button
                  type="button"
                  @click="setHarptosCalendar"
                  class="btn-calendar-type"
                  :class="{ active: calendarSelected && isUsingHarptosCalendar }"
                >
                  <span class="material-symbols-outlined">auto_stories</span>
                  Use Harptos Calendar
                </button>
                <button
                  type="button"
                  @click="setEberronCalendar"
                  class="btn-calendar-type"
                  :class="{ active: calendarSelected && isUsingEberronCalendar }"
                >
                  <span class="material-symbols-outlined">shield</span>
                  Use Eberron Calendar
                </button>
                <button
                  type="button"
                  @click="setShireCalendar"
                  class="btn-calendar-type"
                  :class="{ active: calendarSelected && isUsingShireCalendar }"
                >
                  <span class="material-symbols-outlined">park</span>
                  Use Shire Calendar
                </button>
                <button
                  type="button"
                  @click="setGolarionCalendar"
                  class="btn-calendar-type"
                  :class="{ active: calendarSelected && isUsingGolarionCalendar }"
                >
                  <span class="material-symbols-outlined">explore</span>
                  Use Golarion Calendar
                </button>
                <button
                  type="button"
                  @click="setCustomCalendar"
                  class="btn-calendar-type"
                  :class="{ active: calendarSelected && isUsingCustomCalendar }"
                >
                  <span class="material-symbols-outlined">edit_calendar</span>
                  Create Custom Calendar
                </button>
              </div>

              <div v-if="calendarSelected" class="calendar-info-section">
                <p class="calendar-info">
                  <div v-if="isUsingCustomCalendar">
                    <strong>Custom Calendar:</strong> Create your own unique calendar system. Customize the number of months, days per month, and zodiac signs.
                    The length of your year is determined by the days you assign to each month — currently <strong>{{ totalYearDays }}</strong> days.
                  </div>
                  <div v-else-if="isUsingGregorianCalendar">
                    <strong>Gregorian Calendar:</strong> The standard twelve months are January through December.
                    Note that there are no leap years in this calendar system, so February always has 28 days.
                  </div>
                  <div v-else-if="isUsingGreyhawkCalendar">
                    <strong>Greyhawk Calendar:</strong> The calendar of the World of Greyhawk consists of 12 months of 28 days each,
                    plus 4 festival weeks of 7 days each (Needfest, Growfest, Richfest, and Brewfest), for a total of 364 days per year.
                    The year begins with Needfest and cycles through the seasons.
                  </div>
                  <div v-else-if="isUsingHarptosCalendar">
                    <strong>Harptos Calendar:</strong> The Calendar of Harptos from the Forgotten Realms consists of 12 months of 30 days each,
                    plus 5 festival days (Midwinter, Greengrass, Midsummer, Highharvestide, and Feast of the Moon), for a total of 365 days per year.
                  </div>
                  <div v-else-if="isUsingEberronCalendar">
                    <strong>Eberron Calendar:</strong> The calendar of Eberron consists of 12 months of 28 days each,
                    for a total of 336 days per year. The months are named after the twelve moons of Eberron.
                  </div>
                  <div v-else-if="isUsingShireCalendar">
                    <strong>Shire Calendar:</strong> The Shire Reckoning calendar from Middle-earth consists of 12 months of 30 days each,
                    plus 6 special days (2 Yule days, Midyear's Day, and 3 Lithedays), for a total of 365 days per year.
                  </div>
                  <div v-else-if="isUsingGolarionCalendar">
                    <strong>Golarion Calendar:</strong> The calendar of Golarion from Pathfinder mirrors the Gregorian structure with 365 days per year,
                    but uses different month names drawn from the gods and history of the world.
                  </div>
                  <div v-else>
                    <strong>The Game Calendar:</strong> The standard The Game calendar consists of twelve months
                    much like the Gregorian calendar, but with different names and there are no leap years.
                    The months are: Midspring, Springwane, Summer, Midsummer, Summerwane, Fall, Midfall, Fallwane, Winter, Midwinter, Winterwane, and Spring is the last month of the year.
                  </div>
                </p>
              </div>

              <!-- Month Customization -->
              <div v-if="calendarSelected" class="calendar-customization">
                <div class="customization-header">
                  <h4>{{ isUsingCustomCalendar ? 'Configure Your Months' : 'Customize Month Names (Optional)' }}</h4>
                  <button v-if="isUsingCustomCalendar" type="button" @click="addMonth" class="btn-add-item">
                    <span class="material-symbols-outlined">add</span>
                    Add Month
                  </button>
                </div>
                <p class="customization-hint" v-if="!isUsingCustomCalendar">
                  You can customize the names of months below, or leave them as default.
                </p>
                <p class="customization-hint" v-else>
                  Configure your custom months. Each month needs a name, abbreviation, and number of days.
                </p>
                <div class="month-grid">
                  <div v-for="(month, index) in customCalendar.Months" :key="index" class="month-field" :class="{ 'custom-month': isUsingCustomCalendar }">
                    <div class="month-field-header">
                      <label :for="`month-${index}`" :title="`Month ${index + 1}${!isUsingCustomCalendar ? ` (${month.Days} days)` : ''}`">
                        Month {{ index + 1 }}{{ !isUsingCustomCalendar ? ` (${month.Days} days)` : '' }}
                      </label>
                      <button v-if="isUsingCustomCalendar && customCalendar.Months.length > 1"
                              type="button"
                              @click="removeMonth(index)"
                              class="btn-remove-month"
                              title="Remove this month">
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </div>
                    <input
                      :id="`month-${index}`"
                      type="text"
                      v-model="month.Name"
                      maxlength="32"
                      :placeholder="isUsingCustomCalendar ? 'Month Name' : `Default: ${dateStore.defaultMonths[index]?.Name || 'Month'}`"
                      class="month-name-field"
                    />
                    <div class="month-field-row">
                      <input
                        :id="`month-abbr-${index}`"
                        type="text"
                        v-model="month.Abbr"
                        maxlength="3"
                        :placeholder="isUsingCustomCalendar ? 'Abbr' : `${dateStore.defaultMonths[index]?.Abbr || 'ABR'}`"
                        class="abbr-field"
                      />
                      <input
                        v-if="isUsingCustomCalendar"
                        :id="`month-days-${index}`"
                        type="number"
                        v-model.number="month.Days"
                        min="1"
                        max="999"
                        placeholder="Days"
                        class="days-field"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Zodiac Configuration -->
              <div v-if="calendarSelected" class="zodiac-customization">
                <div class="customization-header">
                  <h4>Zodiac Signs</h4>
                  <button type="button" @click="showZodiacConfig = !showZodiacConfig" class="btn-configure-zodiac">
                    <span class="material-symbols-outlined">{{ showZodiacConfig ? 'expand_less' : 'tune' }}</span>
                    {{ showZodiacConfig ? 'Hide Configuration' : 'Configure Zodiac' }}
                  </button>
                </div>

                <!-- Zodiac Configuration Panel (collapsible) -->
                <div v-if="showZodiacConfig" class="zodiac-config-panel">
                  <div class="customization-header" style="margin-top: 1em;">
                    <p class="customization-hint" style="margin: 0;">
                      Define your zodiac signs. The "End" value represents the day of the year where this zodiac ends.
                      Zodiac signs are automatically distributed evenly across your {{ totalYearDays }}-day year.
                    </p>
                    <button type="button" @click="addZodiac" class="btn-add-item">
                      <span class="material-symbols-outlined">add</span>
                      Add Zodiac
                    </button>
                  </div>
                  <div class="zodiac-grid">
                    <div v-for="(zodiac, index) in customCalendar.Zodiac" :key="index" class="zodiac-field">
                      <div class="zodiac-field-header">
                        <label :for="`zodiac-${index}`" :title="`Zodiac ${index + 1}`">
                          Zodiac {{ index + 1 }}
                        </label>
                        <button v-if="customCalendar.Zodiac.length > 1"
                                type="button"
                                @click="removeZodiac(index)"
                                class="btn-remove-zodiac"
                                title="Remove this zodiac">
                          <span class="material-symbols-outlined">close</span>
                        </button>
                      </div>
                      <div class="zodiac-field-row">
                        <input
                          :id="`zodiac-${index}`"
                          type="text"
                          v-model="zodiac.Name"
                          maxlength="32"
                          placeholder="Zodiac Name"
                          class="zodiac-name-field"
                        />
                        <div class="zodiac-end-display">
                          <label class="end-label">Ends on day:</label>
                          <span class="end-value">{{ zodiac.End }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Starting Date Step -->
          <div v-show="currentStep === steps.date" class="form-step">
            <div class="form-section">
              <h3>Starting Date</h3>
              <p class="section-description">
                Set the starting date for your realm using the calendar you configured in the previous step. You can advance the date later by months or days, but not by years, so choose your year carefully.
              </p>

              <div class="date-section">
                <div class="form-grid date-grid">
                  <div class="form-field">
                    <label for="startingMonth" title="Starting Month">Starting Month <span class="required">*</span></label>
                    <select
                      id="startingMonth"
                      v-model="realmData.Date.m"
                      required
                      class="month-select"
                    >
                      <option
                        v-for="(month, index) in customCalendar.Months"
                        :key="index"
                        :value="index"
                      >
                        {{ month.Name }} ({{ month.Days }} days)
                      </option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="startingDay" title="Starting Day">Starting Day <span class="required">*</span></label>
                    <input
                      type="number"
                      id="startingDay"
                      v-model="realmData.Date.d"
                      :min="1"
                      :max="customCalendar.Months[realmData.Date.m]?.Days || 31"
                      required
                      class="day-input"
                    />
                    <small class="field-hint">Day {{ realmData.Date.d }} of {{ customCalendar.Months[realmData.Date.m]?.Days || 31 }}</small>
                  </div>
                  <div class="form-field">
                    <label for="startingYear" title="Starting Year">Starting Year <span class="required">*</span></label>
                    <input
                      type="number"
                      id="startingYear"
                      v-model="realmData.Date.y"
                      min="1"
                      max="9999"
                      required
                      class="year-input"
                    />
                  </div>
                </div>
                <div class="form-grid">
                  <div class="form-field">
                    <label for="dateSuffixAbbr" title="Date Suffix Abbreviation">Date Suffix Abbreviation <span class="required">*</span></label>
                    <input
                      type="text"
                      id="dateSuffixAbbr"
                      v-model="realmData.DateSuffix.Abbr"
                      maxlength="5"
                      required
                      placeholder="e.g., SF"
                      class="date-suffix-abbr"
                    />
                    <small class="field-hint">Up to 5 characters (e.g., SF, BF, AC, AL)</small>
                  </div>
                  <div class="form-field full-width">
                    <label for="dateSuffixText" title="Date Suffix Full Text">Date Suffix Full Text <span class="required">*</span></label>
                    <input
                      type="text"
                      id="dateSuffixText"
                      v-model="realmData.DateSuffix.Text"
                      maxlength="64"
                      required
                      placeholder="e.g., Since Foundation"
                      class="text-input"
                    />
                    <small class="field-hint">Up to 64 characters (e.g., "Since Foundation", "Before Foundation", "After Conquest")</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Review Step -->
          <div v-show="currentStep === steps.review" class="form-step">
            <div class="form-section">
              <h3>Review Your Realm</h3>
              <p class="section-description">
                Please review the information below before creating your realm.
              </p>

              <div class="review-grid">
                <!-- Realm Information -->
                <div class="review-section">
                  <h4>Realm Information</h4>
                  <div class="review-item">
                    <span class="review-label">Name:</span>
                    <span class="review-value">{{ realmData.Name }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Description:</span>
                    <div class="review-value review-html" v-html="realmData.Description"></div>
                  </div>
                </div>

                <!-- Gaming System (only when hasShop) -->
                <div v-if="features.hasShop" class="review-section">
                  <h4>Gaming System</h4>
                  <div class="review-item">
                    <span class="review-label">System:</span>
                    <span class="review-value">The Game (auto-assigned)</span>
                  </div>
                </div>

                <!-- Activated Content (only when hasShop) -->
                <template v-if="features.hasShop">
                  <div v-if="activatedShopItemIds.length > 0" class="review-section">
                    <h4>Activated Content</h4>
                    <div class="review-activated-items">
                      <span v-for="itemId in activatedShopItemIds" :key="itemId" class="activated-item-chip">
                        {{ getShopItemName(itemId) }}
                      </span>
                    </div>
                  </div>
                  <div v-else class="review-section">
                    <h4>Activated Content</h4>
                    <p class="no-content-message">No additional content activated for this realm.</p>
                  </div>
                </template>

                <!-- Starting Date -->
                <div class="review-section">
                  <h4>Starting Date</h4>
                  <div class="review-item">
                    <span class="review-label">Date:</span>
                    <span class="review-value">
                      {{ customCalendar.Months[realmData.Date.m]?.Name }} {{ realmData.Date.d }}, {{ realmData.Date.y }} {{ realmData.DateSuffix.Abbr }}
                    </span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Date Suffix:</span>
                    <span class="review-value">{{ realmData.DateSuffix.Text }} ({{ realmData.DateSuffix.Abbr }})</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Calendar:</span>
                    <span class="review-value">
                      {{ isUsingGregorianCalendar ? 'Gregorian Calendar' : isUsingGreyhawkCalendar ? 'Greyhawk Calendar' : isUsingHarptosCalendar ? 'Harptos Calendar' : isUsingEberronCalendar ? 'Eberron Calendar' : isUsingShireCalendar ? 'Shire Calendar' : isUsingGolarionCalendar ? 'Golarion Calendar' : isUsingDefaultCalendar ? 'The Game Calendar' : 'Custom Calendar' }}
                    </span>
                  </div>
                </div>

                <!-- Calendar Months (if customized) -->
                <div v-if="!isUsingDefaultCalendar" class="review-section">
                  <h4>Calendar Months</h4>
                  <div class="review-months">
                    <span v-for="(month, index) in customCalendar.Months" :key="index" class="month-chip">
                      {{ month.Name }} ({{ month.Abbr }}{{ isUsingCustomCalendar ? `, ${month.Days}d` : '' }})
                    </span>
                  </div>
                  <div v-if="isUsingCustomCalendar" class="review-item" style="margin-top: 1em;">
                    <span class="review-label">Total Days:</span>
                    <span class="review-value">{{ totalYearDays }} days per year</span>
                  </div>
                </div>

                <!-- Zodiac Signs (if custom calendar) -->
                <div v-if="isUsingCustomCalendar" class="review-section">
                  <h4>Zodiac Signs</h4>
                  <div class="review-zodiacs">
                    <span v-for="(zodiac, index) in customCalendar.Zodiac" :key="index" class="zodiac-chip">
                      {{ zodiac.Name }} (ends day {{ zodiac.End }})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="step-navigation">
            <button
              v-if="currentStep > 1"
              @click="previousStep"
              class="btn-nav btn-previous"
              :disabled="isCreating"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              Previous
            </button>
            <div class="nav-spacer"></div>
            <button
              v-if="currentStep < totalSteps"
              @click="nextStep"
              class="btn-nav btn-next"
              :disabled="isCreating || (currentStep === steps.calendar && !calendarSelected)"
            >
              Next
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
            <button
              v-else
              @click="save"
              class="btn-nav btn-finish"
              :disabled="isCreating"
            >
              <span class="material-symbols-outlined" v-if="!isCreating">check</span>
              <span class="loading-spinner" v-else></span>
              {{ isCreating ? 'Creating...' : 'Create Realm' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountStore } from '@shared/stores/account';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';
import { useDateStore } from '@shared/stores/date';
import { useShopStore } from '@shared/stores/shop';
import { features } from '@shared/config/features';
import apiClient from '@shared/utils/api';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Link,
  List,
  Heading,
  BlockQuote,
  Undo
} from 'ckeditor5';
import { Ckeditor } from '@ckeditor/ckeditor5-vue';
import 'ckeditor5/ckeditor5.css';

const router = useRouter();
const accountStore = useAccountStore();
const realmStore = useRealmStore();
const userStore = useUserStore();
const dateStore = useDateStore();
const shopStore = useShopStore();

// Gaming system ID auto-assigned from env var for this subdomain
const gamingSystemId = import.meta.env.VITE_GAMING_SYSTEM_ID;

const elName = ref(null);
const isCreating = ref(false);
const currentStep = ref(1);
const showZodiacConfig = ref(false);

// Dynamic step map based on features
const steps = computed(() => {
  const s = { name: 1 };
  let n = 2;
  if (features.hasShop) s.content = n++;
  s.calendar = n++;
  s.date = n++;
  s.review = n++;
  return s;
});
const totalSteps = computed(() => Object.keys(steps.value).length);

// CKEditor configuration
const editor = ClassicEditor;
const editorConfig = {
  licenseKey: 'GPL',
  plugins: [
    Essentials,
    Paragraph,
    Bold,
    Italic,
    Link,
    List,
    Heading,
    BlockQuote,
    Undo
  ],
  toolbar: [
    'heading', '|',
    'bold', 'italic', 'link', '|',
    'bulletedList', 'numberedList', '|',
    'blockQuote', '|',
    'undo', 'redo'
  ]
};

// Initialize calendar with default months
const customCalendar = ref({
  Months: JSON.parse(JSON.stringify(dateStore.defaultMonths)),
  Zodiac: JSON.parse(JSON.stringify(dateStore.defaultZodiac))
});

const realmData = ref({
  Name: '',
  Description: '',
  Date: {
    d: 1,
    m: 0,
    moon: 0,
    y: 1,
    zodiac: ''
  },
  DateSuffix: {
    Abbr: 'SF',
    Text: 'Since Foundation'
  },
  Calendar: null, // Will be set if customized
  MaxCharacters: 500,
  MaxPlayers: 4
});

// Shop items state
const loadingShopItems = ref(false);
const purchasedShopItems = ref([]);
const activatedShopItemIds = ref([]);
const realmForgeEssentialsId = ref(null); // Track RealmForge Essentials ID to prevent deselection

// Per-gaming-system free realm limit (loaded from gaming system, falls back to account-level limit)
const freeRealmLimit = ref(accountStore.account?.Realms || 3);

const gamingSystemFreeRealms = computed(() => {
  return freeRealmLimit.value;
});

const remainingRealms = computed(() => {
  const gsId = import.meta.env.VITE_GAMING_SYSTEM_ID;
  const ownedForGS = realmStore.arOwnedFreeRealms.filter(realm => {
    const realmGsId = realm.GamingSystem?.classes;
    const gsMatch = typeof realmGsId === 'string' ? realmGsId : realmGsId?.GamingSystemID;
    return gsMatch === gsId;
  }).length;
  const limit = gamingSystemFreeRealms.value;
  return limit - ownedForGS;
});

const hasReachedRealmLimit = computed(() => {
  return remainingRealms.value <= 0;
});

// Calendar type detection
const isUsingDefaultCalendar = computed(() => {
  return customCalendar.value.Months.every((month, index) =>
    month.Name === dateStore.defaultMonths[index].Name
  );
});

const isUsingGregorianCalendar = computed(() => {
  const gregorianMonths = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
  return customCalendar.value.Months.every((month, index) =>
    month.Name === gregorianMonths[index]
  );
});

const isUsingGreyhawkCalendar = computed(() => {
  const greyhawkMonths = [
    'Needfest', 'Fireseek', 'Readying', 'Coldeven', 'Growfest',
    'Planting', 'Flocktime', 'Wealsun', 'Richfest', 'Reaping',
    'Goodmonth', 'Harvester', 'Brewfest', 'Patchwall', "Ready'reat", 'Sunsebb'
  ];
  return customCalendar.value.Months.length === 16 &&
         customCalendar.value.Months.every((month, index) =>
           month.Name === greyhawkMonths[index]
         );
});

const isUsingHarptosCalendar = computed(() => {
  const harptosMonths = [
    'Hammer', 'Midwinter', 'Alturiak', 'Ches', 'Tarsakh', 'Greengrass',
    'Mirtul', 'Kythorn', 'Flamerule', 'Midsummer', 'Eleasis', 'Eleint',
    'Highharvestide', 'Marpenoth', 'Uktar', 'Feast of the Moon', 'Nightal'
  ];
  return customCalendar.value.Months.length === 17 &&
         customCalendar.value.Months.every((month, index) =>
           month.Name === harptosMonths[index]
         );
});

const isUsingEberronCalendar = computed(() => {
  const eberronMonths = [
    'Zarantyr', 'Olarune', 'Therendor', 'Eyre', 'Dravago', 'Nymm',
    'Lharvion', 'Barrakas', 'Rhaan', 'Sypheros', 'Aryth', 'Vult'
  ];
  return customCalendar.value.Months.length === 12 &&
         customCalendar.value.Months.every((month, index) =>
           month.Name === eberronMonths[index]
         );
});

const isUsingShireCalendar = computed(() => {
  const shireMonths = [
    'Yule', 'Afteryule', 'Solmath', 'Rethe', 'Astron', 'Thrimidge',
    'Forelithe', 'Lithedays', 'Midyear\'s Day', 'Afterlithe', 'Wedmath',
    'Halimath', 'Winterfilth', 'Blotmath', 'Foreyule'
  ];
  return customCalendar.value.Months.length === 15 &&
         customCalendar.value.Months.every((month, index) =>
           month.Name === shireMonths[index]
         );
});

const isUsingGolarionCalendar = computed(() => {
  const golarionMonths = [
    'Abadius', 'Calistril', 'Pharast', 'Gozran', 'Desnus', 'Sarenith',
    'Erastus', 'Arodus', 'Rova', 'Lamashan', 'Neth', 'Kuthona'
  ];
  return customCalendar.value.Months.length === 12 &&
         customCalendar.value.Months.every((month, index) =>
           month.Name === golarionMonths[index]
         );
});

const isUsingCustomCalendar = ref(false);
const calendarSelected = ref(false); // Track if user has explicitly selected a calendar

const totalYearDays = computed(() => {
  return customCalendar.value.Months.reduce((sum, month) => sum + (month.Days || 0), 0);
});

// Watch for month changes to adjust day if needed
watch(() => realmData.value.Date.m, (newMonth) => {
  const maxDays = customCalendar.value.Months[newMonth]?.Days || 31;
  if (realmData.value.Date.d > maxDays) {
    realmData.value.Date.d = maxDays;
  }
});

// Watch for calendar customization to update month display
watch(() => customCalendar.value.Months, () => {
  const maxDays = customCalendar.value.Months[realmData.value.Date.m]?.Days || 31;
  if (realmData.value.Date.d > maxDays) {
    realmData.value.Date.d = maxDays;
  }
}, { deep: true });

// Watch for month Days changes to recalculate zodiacs in custom calendar mode
watch(() => customCalendar.value.Months.map(m => m.Days), () => {
  if (isUsingCustomCalendar.value) {
    recalculateZodiacs();
  }
}, { deep: true });

onMounted(async () => {
  if (elName.value) {
    elName.value.focus();
  }

  // Load gaming system's FreeRealms limit
  const gsId = import.meta.env.VITE_GAMING_SYSTEM_ID;
  if (gsId) {
    try {
      const { useGamingSystemsStore } = await import(/* @vite-ignore */ '@/stores/gamingSystems');
      const gamingSystemsStore = useGamingSystemsStore();
      if (!gamingSystemsStore.isLoaded) {
        await gamingSystemsStore.fetchGamingSystems();
      }
      const gs = gamingSystemsStore.getSystemById(gsId);
      if (gs?.FreeRealms !== undefined) {
        freeRealmLimit.value = gs.FreeRealms;
      }
    } catch (err) {
      console.warn('Failed to load gaming system free realm limit:', err);
    }
  }

  // Load purchased shop items for the auto-assigned gaming system (only when hasShop)
  if (features.hasShop && gamingSystemId) {
    await loadPurchasedShopItems(gamingSystemId);
  }

  // Check if user can create more realms
  if (remainingRealms.value <= 0) {
    console.warn('User has reached realm limit');
  }
});

const loadPurchasedShopItems = async (systemId) => {
  if (!systemId) {
    purchasedShopItems.value = [];
    return;
  }

  loadingShopItems.value = true;

  try {
    // Fetch products from the shop store
    await shopStore.fetchSystemProducts(systemId, false, { source: 'realm-create' });

    // Get products from store
    let items = shopStore.getProductsBySystemId(systemId);

    // Find system product (e.g., RealmForge Essentials) - auto-selected and locked
    const essentialsItem = items.find(item => item.IsSystemProduct === true);
    if (essentialsItem) {
      realmForgeEssentialsId.value = essentialsItem.ID;
      purchasedShopItems.value = items;
      activatedShopItemIds.value = [essentialsItem.ID];
      return;
    }

    // Fallback: show purchased items
    const shopItemIds = accountStore.account?.Access?.[systemId] || [];
    if (shopItemIds.length > 0) {
      items = items.filter(item => shopItemIds.includes(item.ID));
    }

    purchasedShopItems.value = items;
    activatedShopItemIds.value = items.map(item => item.ID);
  } catch (error) {
    console.error('Error loading purchased shop items:', error);
    purchasedShopItems.value = [];
  } finally {
    loadingShopItems.value = false;
  }
};

const isShopItemActivated = (itemId) => {
  return activatedShopItemIds.value.includes(itemId);
};

const toggleShopItemActivation = (itemId) => {
  // Prevent deselecting RealmForge Essentials
  if (itemId === realmForgeEssentialsId.value) {
    return;
  }

  const index = activatedShopItemIds.value.indexOf(itemId);
  if (index === -1) {
    activatedShopItemIds.value.push(itemId);
  } else {
    activatedShopItemIds.value.splice(index, 1);
  }
};

const getShopItemName = (itemId) => {
  const item = purchasedShopItems.value.find(i => i.ID === itemId);
  return item?.Name || itemId;
};

const getShopItemIcon = (item) => {
  // Return appropriate icon based on item type
  if (!item.Items || item.Items.length === 0) return 'inventory_2';

  const types = item.Items.map(i => i.Type);
  if (types.includes('Spells')) return 'auto_fix_high';
  if (types.includes('Classes')) return 'school';
  if (types.includes('Maps')) return 'map';
  if (types.includes('Modules')) return 'library_books';
  return 'inventory_2';
};

const getItemTags = (item) => {
  if (!item.Items || item.Items.length === 0) return [];

  const tags = new Set();
  item.Items.forEach(i => {
    if (i.Type) tags.add(i.Type);
  });
  return Array.from(tags);
};

const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const getStepLabel = (step) => {
  // Build labels dynamically based on step map
  const stepNames = Object.entries(steps.value);
  const match = stepNames.find(([, num]) => num === step);
  if (!match) return '';
  const labelMap = {
    name: 'Realm Info',
    content: 'Content',
    calendar: 'Calendar',
    date: 'Starting Date',
    review: 'Review'
  };
  return labelMap[match[0]] || '';
};

const validateCurrentStep = () => {
  const errors = [];
  const s = steps.value;

  if (currentStep.value === s.name) {
    if (!realmData.value.Name?.trim()) {
      errors.push('Realm name is required');
    }
    if (!realmData.value.Description?.trim() || realmData.value.Description === '<p></p>' || realmData.value.Description === '<p>&nbsp;</p>') {
      errors.push('Realm description is required');
    }
  } else if (features.hasShop && currentStep.value === s.content) {
    // Content activation step (optional, no required validation)
    // Users can proceed without activating any content
  } else if (currentStep.value === s.calendar) {
    // Calendar validation
    if (isUsingCustomCalendar.value) {
      // Validate months
      if (customCalendar.value.Months.length === 0) {
        errors.push('Custom calendar must have at least one month');
      }

      customCalendar.value.Months.forEach((month, index) => {
        if (!month.Name?.trim()) {
          errors.push(`Month ${index + 1} must have a name`);
        }
        if (!month.Abbr?.trim()) {
          errors.push(`Month ${index + 1} must have an abbreviation`);
        }
        if (!month.Days || month.Days < 1) {
          errors.push(`Month ${index + 1} must have at least 1 day`);
        }
      });

      // Validate zodiacs
      if (customCalendar.value.Zodiac.length === 0) {
        errors.push('Custom calendar must have at least one zodiac sign');
      }

      customCalendar.value.Zodiac.forEach((zodiac, index) => {
        if (!zodiac.Name?.trim()) {
          errors.push(`Zodiac ${index + 1} must have a name`);
        }
      });

      // Validate that last zodiac End equals total year days
      const lastZodiac = customCalendar.value.Zodiac[customCalendar.value.Zodiac.length - 1];
      if (lastZodiac && lastZodiac.End !== totalYearDays.value) {
        errors.push(`Zodiac configuration is invalid. Last zodiac should end at day ${totalYearDays.value}`);
      }
    }
  } else if (currentStep.value === s.date) {
    // Starting Date validation
    if (!realmData.value.Date.y || realmData.value.Date.y < 1 || realmData.value.Date.y > 9999) {
      errors.push('Starting year must be between 1 and 9999');
    }
    if (realmData.value.Date.m < 0 || realmData.value.Date.m >= customCalendar.value.Months.length) {
      errors.push('Starting month must be selected');
    }
    const maxDays = customCalendar.value.Months[realmData.value.Date.m]?.Days || 31;
    if (!realmData.value.Date.d || realmData.value.Date.d < 1 || realmData.value.Date.d > maxDays) {
      errors.push('Starting day must be a valid number for the selected month');
    }
    if (!realmData.value.DateSuffix.Abbr?.trim()) {
      errors.push('Date suffix abbreviation is required');
    }
    if (!realmData.value.DateSuffix.Text?.trim()) {
      errors.push('Date suffix full text is required');
    }
  }

  return errors;
};

const nextStep = () => {
  const errors = validateCurrentStep();

  if (errors.length > 0) {
    alert('Please fix the following errors:\n\u2022 ' + errors.join('\n\u2022 '));
    return;
  }

  if (currentStep.value < totalSteps.value) {
    currentStep.value++;
  }
};

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const resetCalendarToDefault = () => {
  calendarSelected.value = true;
  isUsingCustomCalendar.value = false;
  customCalendar.value = {
    Months: JSON.parse(JSON.stringify(dateStore.defaultMonths)),
    Zodiac: JSON.parse(JSON.stringify(dateStore.defaultZodiac))
  };
  // Recalculate zodiac End values based on total year days
  recalculateZodiacs();

  // Reset to default date suffix for The Game calendar
  realmData.value.DateSuffix.Abbr = 'SF';
  realmData.value.DateSuffix.Text = 'Since Foundation';

  showZodiacConfig.value = false;
};

const setGregorianCalendar = () => {
  calendarSelected.value = true;
  const gregorianMonths = [
    { Name: 'January', Abbr: 'JAN', Days: 31 },
    { Name: 'February', Abbr: 'FEB', Days: 28 },
    { Name: 'March', Abbr: 'MAR', Days: 31 },
    { Name: 'April', Abbr: 'APR', Days: 30 },
    { Name: 'May', Abbr: 'MAY', Days: 31 },
    { Name: 'June', Abbr: 'JUN', Days: 30 },
    { Name: 'July', Abbr: 'JUL', Days: 31 },
    { Name: 'August', Abbr: 'AUG', Days: 31 },
    { Name: 'September', Abbr: 'SEP', Days: 30 },
    { Name: 'October', Abbr: 'OCT', Days: 31 },
    { Name: 'November', Abbr: 'NOV', Days: 30 },
    { Name: 'December', Abbr: 'DEC', Days: 31 }
  ];

  // Replace months entirely (handles switching from calendars with different month counts)
  customCalendar.value.Months = JSON.parse(JSON.stringify(gregorianMonths));

  isUsingCustomCalendar.value = false;

  // Reset zodiac to default and recalculate for Gregorian year (365 days)
  customCalendar.value.Zodiac = JSON.parse(JSON.stringify(dateStore.defaultZodiac));
  recalculateZodiacs();

  // Set Gregorian-specific date suffix
  realmData.value.DateSuffix.Abbr = 'CE';
  realmData.value.DateSuffix.Text = 'Common Era';

  const maxDays = customCalendar.value.Months[realmData.value.Date.m]?.Days || 31;
  if (realmData.value.Date.d > maxDays) {
    realmData.value.Date.d = maxDays;
  }
  showZodiacConfig.value = false;
};

const setGreyhawkCalendar = () => {
  calendarSelected.value = true;
  const greyhawkMonths = [
    { Name: 'Needfest', Abbr: 'NFT', Days: 7 },    // Festival week
    { Name: 'Fireseek', Abbr: 'FIR', Days: 28 },
    { Name: 'Readying', Abbr: 'REA', Days: 28 },
    { Name: 'Coldeven', Abbr: 'COL', Days: 28 },
    { Name: 'Growfest', Abbr: 'GFT', Days: 7 },    // Festival week
    { Name: 'Planting', Abbr: 'PLA', Days: 28 },
    { Name: 'Flocktime', Abbr: 'FLO', Days: 28 },
    { Name: 'Wealsun', Abbr: 'WEA', Days: 28 },
    { Name: 'Richfest', Abbr: 'RFT', Days: 7 },    // Festival week
    { Name: 'Reaping', Abbr: 'REP', Days: 28 },
    { Name: 'Goodmonth', Abbr: 'GOO', Days: 28 },
    { Name: 'Harvester', Abbr: 'HAR', Days: 28 },
    { Name: 'Brewfest', Abbr: 'BFT', Days: 7 },    // Festival week
    { Name: 'Patchwall', Abbr: 'PAT', Days: 28 },
    { Name: "Ready'reat", Abbr: 'RDY', Days: 28 },
    { Name: 'Sunsebb', Abbr: 'SUN', Days: 28 }
  ];

  // Set to 16 months (12 regular + 4 festivals)
  customCalendar.value.Months = greyhawkMonths;

  // Reset zodiac to default and recalculate for Greyhawk year (364 days)
  customCalendar.value.Zodiac = JSON.parse(JSON.stringify(dateStore.defaultZodiac));
  recalculateZodiacs();

  // Set Greyhawk-specific date suffix
  realmData.value.DateSuffix.Abbr = 'CY';
  realmData.value.DateSuffix.Text = 'Common Year';

  isUsingCustomCalendar.value = false;

  // Adjust selected date if needed
  if (realmData.value.Date.m >= customCalendar.value.Months.length) {
    realmData.value.Date.m = 0;
  }

  const maxDays = customCalendar.value.Months[realmData.value.Date.m]?.Days || 28;
  if (realmData.value.Date.d > maxDays) {
    realmData.value.Date.d = maxDays;
  }
  showZodiacConfig.value = false;
};

const setHarptosCalendar = () => {
  calendarSelected.value = true;
  const harptosMonths = [
    { Name: 'Hammer', Abbr: 'HAM', Days: 30 },
    { Name: 'Midwinter', Abbr: 'MID', Days: 1 },       // Festival day
    { Name: 'Alturiak', Abbr: 'ALT', Days: 30 },
    { Name: 'Ches', Abbr: 'CHE', Days: 30 },
    { Name: 'Tarsakh', Abbr: 'TAR', Days: 30 },
    { Name: 'Greengrass', Abbr: 'GRG', Days: 1 },      // Festival day
    { Name: 'Mirtul', Abbr: 'MIR', Days: 30 },
    { Name: 'Kythorn', Abbr: 'KYT', Days: 30 },
    { Name: 'Flamerule', Abbr: 'FLA', Days: 30 },
    { Name: 'Midsummer', Abbr: 'MSM', Days: 1 },       // Festival day
    { Name: 'Eleasis', Abbr: 'ELE', Days: 30 },
    { Name: 'Eleint', Abbr: 'ELI', Days: 30 },
    { Name: 'Highharvestide', Abbr: 'HHT', Days: 1 },  // Festival day
    { Name: 'Marpenoth', Abbr: 'MAR', Days: 30 },
    { Name: 'Uktar', Abbr: 'UKT', Days: 30 },
    { Name: 'Feast of the Moon', Abbr: 'FOM', Days: 1 }, // Festival day
    { Name: 'Nightal', Abbr: 'NIG', Days: 30 }
  ];

  customCalendar.value.Months = harptosMonths;

  customCalendar.value.Zodiac = JSON.parse(JSON.stringify(dateStore.defaultZodiac));
  recalculateZodiacs();

  realmData.value.DateSuffix.Abbr = 'DR';
  realmData.value.DateSuffix.Text = 'Dalereckoning';

  isUsingCustomCalendar.value = false;

  if (realmData.value.Date.m >= customCalendar.value.Months.length) {
    realmData.value.Date.m = 0;
  }

  const maxDays = customCalendar.value.Months[realmData.value.Date.m]?.Days || 30;
  if (realmData.value.Date.d > maxDays) {
    realmData.value.Date.d = maxDays;
  }
  showZodiacConfig.value = false;
};

const setEberronCalendar = () => {
  calendarSelected.value = true;
  const eberronMonths = [
    { Name: 'Zarantyr', Abbr: 'ZAR', Days: 28 },
    { Name: 'Olarune', Abbr: 'OLA', Days: 28 },
    { Name: 'Therendor', Abbr: 'THE', Days: 28 },
    { Name: 'Eyre', Abbr: 'EYR', Days: 28 },
    { Name: 'Dravago', Abbr: 'DRA', Days: 28 },
    { Name: 'Nymm', Abbr: 'NYM', Days: 28 },
    { Name: 'Lharvion', Abbr: 'LHA', Days: 28 },
    { Name: 'Barrakas', Abbr: 'BAR', Days: 28 },
    { Name: 'Rhaan', Abbr: 'RHA', Days: 28 },
    { Name: 'Sypheros', Abbr: 'SYP', Days: 28 },
    { Name: 'Aryth', Abbr: 'ARY', Days: 28 },
    { Name: 'Vult', Abbr: 'VUL', Days: 28 }
  ];

  customCalendar.value.Months = eberronMonths;

  customCalendar.value.Zodiac = JSON.parse(JSON.stringify(dateStore.defaultZodiac));
  recalculateZodiacs();

  realmData.value.DateSuffix.Abbr = 'YK';
  realmData.value.DateSuffix.Text = 'Year of the Kingdom';

  isUsingCustomCalendar.value = false;

  const maxDays = customCalendar.value.Months[realmData.value.Date.m]?.Days || 28;
  if (realmData.value.Date.d > maxDays) {
    realmData.value.Date.d = maxDays;
  }
  showZodiacConfig.value = false;
};

const setShireCalendar = () => {
  calendarSelected.value = true;
  const shireMonths = [
    { Name: 'Yule', Abbr: 'YUL', Days: 2 },            // Special days (2 Yule)
    { Name: 'Afteryule', Abbr: 'AFY', Days: 30 },
    { Name: 'Solmath', Abbr: 'SOL', Days: 30 },
    { Name: 'Rethe', Abbr: 'RET', Days: 30 },
    { Name: 'Astron', Abbr: 'AST', Days: 30 },
    { Name: 'Thrimidge', Abbr: 'THR', Days: 30 },
    { Name: 'Forelithe', Abbr: 'FRL', Days: 30 },
    { Name: 'Lithedays', Abbr: 'LIT', Days: 2 },       // Special days (1 Lithe + 2 Lithe)
    { Name: "Midyear's Day", Abbr: 'MYD', Days: 1 },   // Special day
    { Name: 'Afterlithe', Abbr: 'AFL', Days: 30 },
    { Name: 'Wedmath', Abbr: 'WED', Days: 30 },
    { Name: 'Halimath', Abbr: 'HAL', Days: 30 },
    { Name: 'Winterfilth', Abbr: 'WIN', Days: 30 },
    { Name: 'Blotmath', Abbr: 'BLO', Days: 30 },
    { Name: 'Foreyule', Abbr: 'FRY', Days: 30 }
  ];

  customCalendar.value.Months = shireMonths;

  customCalendar.value.Zodiac = JSON.parse(JSON.stringify(dateStore.defaultZodiac));
  recalculateZodiacs();

  realmData.value.DateSuffix.Abbr = 'SR';
  realmData.value.DateSuffix.Text = 'Shire Reckoning';

  isUsingCustomCalendar.value = false;

  if (realmData.value.Date.m >= customCalendar.value.Months.length) {
    realmData.value.Date.m = 0;
  }

  const maxDays = customCalendar.value.Months[realmData.value.Date.m]?.Days || 30;
  if (realmData.value.Date.d > maxDays) {
    realmData.value.Date.d = maxDays;
  }
  showZodiacConfig.value = false;
};

const setGolarionCalendar = () => {
  calendarSelected.value = true;
  const golarionMonths = [
    { Name: 'Abadius', Abbr: 'ABA', Days: 31 },
    { Name: 'Calistril', Abbr: 'CAL', Days: 28 },
    { Name: 'Pharast', Abbr: 'PHA', Days: 31 },
    { Name: 'Gozran', Abbr: 'GOZ', Days: 30 },
    { Name: 'Desnus', Abbr: 'DES', Days: 31 },
    { Name: 'Sarenith', Abbr: 'SAR', Days: 30 },
    { Name: 'Erastus', Abbr: 'ERA', Days: 31 },
    { Name: 'Arodus', Abbr: 'ARO', Days: 31 },
    { Name: 'Rova', Abbr: 'ROV', Days: 30 },
    { Name: 'Lamashan', Abbr: 'LAM', Days: 31 },
    { Name: 'Neth', Abbr: 'NET', Days: 30 },
    { Name: 'Kuthona', Abbr: 'KUT', Days: 31 }
  ];

  customCalendar.value.Months = JSON.parse(JSON.stringify(golarionMonths));

  isUsingCustomCalendar.value = false;

  customCalendar.value.Zodiac = JSON.parse(JSON.stringify(dateStore.defaultZodiac));
  recalculateZodiacs();

  realmData.value.DateSuffix.Abbr = 'AR';
  realmData.value.DateSuffix.Text = 'Absalom Reckoning';

  const maxDays = customCalendar.value.Months[realmData.value.Date.m]?.Days || 31;
  if (realmData.value.Date.d > maxDays) {
    realmData.value.Date.d = maxDays;
  }
  showZodiacConfig.value = false;
};

const setCustomCalendar = () => {
  calendarSelected.value = true;
  isUsingCustomCalendar.value = true;

  // Initialize with 12 empty months for customization
  customCalendar.value.Months = Array.from({ length: 12 }, (_, index) => ({
    Name: `Month ${index + 1}`,
    Abbr: `M${index + 1}`,
    Days: 30
  }));

  // Initialize with 12 real-world zodiac signs
  const realWorldZodiacs = [
    { Name: 'Aries', End: 0 },
    { Name: 'Taurus', End: 0 },
    { Name: 'Gemini', End: 0 },
    { Name: 'Cancer', End: 0 },
    { Name: 'Leo', End: 0 },
    { Name: 'Virgo', End: 0 },
    { Name: 'Libra', End: 0 },
    { Name: 'Scorpio', End: 0 },
    { Name: 'Sagittarius', End: 0 },
    { Name: 'Capricorn', End: 0 },
    { Name: 'Aquarius', End: 0 },
    { Name: 'Pisces', End: 0 }
  ];

  customCalendar.value.Zodiac = realWorldZodiacs;

  // Recalculate zodiac End values based on total days
  recalculateZodiacs();

  // Show zodiac config panel for custom calendars
  showZodiacConfig.value = true;
};

const addMonth = () => {
  customCalendar.value.Months.push({
    Name: `Month ${customCalendar.value.Months.length + 1}`,
    Abbr: `M${customCalendar.value.Months.length + 1}`,
    Days: 30
  });
  recalculateZodiacs();
};

const removeMonth = (index) => {
  if (customCalendar.value.Months.length <= 1) {
    alert('You must have at least one month in your calendar.');
    return;
  }
  customCalendar.value.Months.splice(index, 1);

  // Adjust selected month if needed
  if (realmData.value.Date.m >= customCalendar.value.Months.length) {
    realmData.value.Date.m = customCalendar.value.Months.length - 1;
  }

  recalculateZodiacs();
};

const addZodiac = () => {
  customCalendar.value.Zodiac.push({
    Name: `Zodiac ${customCalendar.value.Zodiac.length + 1}`,
    End: 0
  });
  recalculateZodiacs();
};

const removeZodiac = (index) => {
  if (customCalendar.value.Zodiac.length <= 1) {
    alert('You must have at least one zodiac sign in your calendar.');
    return;
  }
  customCalendar.value.Zodiac.splice(index, 1);
  recalculateZodiacs();
};

const recalculateZodiacs = () => {
  const total = totalYearDays.value;
  const zodiacCount = customCalendar.value.Zodiac.length;

  if (zodiacCount === 0 || total === 0) return;

  // Distribute days evenly across zodiac signs
  const daysPerZodiac = total / zodiacCount;

  customCalendar.value.Zodiac.forEach((zodiac, index) => {
    // Calculate cumulative end day (rounded)
    const endDay = Math.round(daysPerZodiac * (index + 1));
    zodiac.End = endDay;
  });

  // Ensure the last zodiac ends exactly at total days
  if (customCalendar.value.Zodiac.length > 0) {
    customCalendar.value.Zodiac[customCalendar.value.Zodiac.length - 1].End = total;
  }
};

const isCalendarCustomized = () => {
  return customCalendar.value.Months.some((month, index) =>
    month.Name !== dateStore.defaultMonths[index].Name ||
    month.Abbr !== dateStore.defaultMonths[index].Abbr ||
    month.Days !== dateStore.defaultMonths[index].Days
  );
};

const save = async () => {
  if (isCreating.value) return;

  try {
    // Validate all required steps (exclude review step)
    const allErrors = [];
    const stepsToValidate = totalSteps.value - 1; // All steps except review
    for (let step = 1; step <= stepsToValidate; step++) {
      currentStep.value = step;
      const errors = validateCurrentStep();
      allErrors.push(...errors);
    }
    currentStep.value = steps.value.review; // Return to review step

    if (remainingRealms.value <= 0) {
      alert('You have reached your maximum number of realms. Please upgrade your subscription or delete an existing realm.');
      return;
    }

    if (allErrors.length > 0) {
      alert('Please fix the following errors:\n\u2022 ' + allErrors.join('\n\u2022 '));
      return;
    }

    isCreating.value = true;

    // Include custom calendar if it has been modified
    if (isCalendarCustomized()) {
      realmData.value.Calendar = customCalendar.value;
      console.log('Including custom calendar in realm creation:', customCalendar.value);
    } else {
      console.log('No calendar customization detected');
    }

    // Auto-assign gaming system from env var
    const realmPayload = {
      ...realmData.value,
      GamingSystem: {
        classes: gamingSystemId,
        spells: gamingSystemId,
        races: gamingSystemId
      }
    };

    // Include activated shop items only when hasShop
    if (features.hasShop) {
      realmPayload.ActivatedShopItems = activatedShopItemIds.value;
    }

    console.log('Final realm data being sent:', JSON.stringify(realmPayload, null, 2));

    const result = await realmStore.createRealm(realmPayload);

    if (result.success) {
      console.log('Realm created successfully');
      router.push('/account');
    } else {
      throw new Error(result.error || 'Failed to create realm');
    }

  } catch (error) {
    console.error('Error creating realm:', error);
    alert(error.message || 'An error occurred while creating the realm. Please try again.');
  } finally {
    isCreating.value = false;
  }
};

const cancel = () => {
  if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
    router.push('/account');
  }
};
</script>

<style scoped>
.realm-create {
  height: 100%;
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    hsl(220, 30%, 6%) 0%,
    hsl(260, 40%, 18%) 25%,
    hsl(200, 35%, 8%) 50%,
    hsl(280, 35%, 16%) 75%,
    hsl(220, 30%, 6%) 100%
  );
  background-size: 400% 400%;
  animation: realmCreateGradient 16s ease infinite;
  border-radius: 8px;
  color: #ffffff;
}

.create-container {
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 1.5rem;
}

/* Realm Limit Warning */
.realm-limit-warning {
  background: rgba(255, 152, 0, 0.1);
  border: 2px solid #ff9800;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.realm-limit-warning .warning-icon {
  color: #ff9800;
  font-size: 2rem;
}

.realm-limit-warning .warning-content h3 {
  color: #ff9800;
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.realm-limit-warning .warning-content p {
  color: #D2B48C;
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.realm-limit-warning .btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.realm-limit-warning .btn:hover {
  background-color: #f57c00;
}

.create-header {
  width: 100%;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 0.3em;
  padding: 0.8em 1em;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--theme-accent);
  font-size: 1.2em;
  font-weight: 600;
  text-shadow: 1px 1px 2px color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
  box-sizing: border-box;
}

.header-actions {
  display: flex;
  gap: 0.5em;
}

.btn-cancel {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: 1px solid var(--theme-accent);
  border-radius: 0.3em;
  padding: 0.4em 0.8em;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
}

.btn-cancel:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

/* Step Indicator */
.step-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  position: relative;
}

.step-indicator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 2rem;
  right: 2rem;
  height: 2px;
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  transform: translateY(-50%);
  z-index: 0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  border: 2px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  transition: all 0.3s ease;
}

.step-item.active .step-number {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-color: var(--theme-accent);
  color: var(--theme-bg-surface);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.step-item.completed .step-number {
  background: color-mix(in srgb, var(--theme-success) 30%, transparent);
  border-color: var(--theme-success);
  color: var(--theme-success);
}

.step-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-item.active .step-label {
  color: var(--theme-accent);
  font-weight: 600;
}

.step-item.completed .step-label {
  color: color-mix(in srgb, var(--theme-success) 80%, transparent);
}

.realm-create-content {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  display: flex;
  flex-direction: column;
}

.realm-create-form {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5em;
}

.form-step {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-section {
  background: color-mix(in srgb, var(--theme-bg-surface) 30%, transparent);
  border: 1px solid #444;
  border-radius: 0.5em;
  padding: 1.5em;
}

.section-description {
  color: #ccc;
  font-size: 0.9em;
  margin: 0.5em 0 1em 0;
  line-height: 1.5;
}

.editor-container {
  margin-top: 0.5em;
}

.editor-container :deep(.ck-editor__editable) {
  min-height: 200px;
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  border-color: #444;
  color: #fff;
}

.editor-container :deep(.ck-editor__editable:focus) {
  border-color: var(--theme-accent);
  box-shadow: 0 0 5px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

/* Gaming System Notice */
.gaming-system-notice {
  background: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.3);
  border-radius: 0.5em;
  padding: 1.5em;
  margin-bottom: 1.5em;
  display: flex;
  gap: 1em;
  align-items: flex-start;
}

.gaming-system-notice .notice-icon {
  color: #3498db;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.gaming-system-notice .notice-content {
  flex: 1;
}

.gaming-system-notice .notice-content p {
  color: #D2B48C;
  margin: 0 0 0.75em 0;
  line-height: 1.6;
}

.gaming-system-notice .notice-content p:last-child {
  margin-bottom: 0;
}

.gaming-system-notice .notice-content a {
  color: #3498db;
  text-decoration: underline;
  font-weight: 600;
}

.gaming-system-notice .notice-content a:hover {
  color: #5dade2;
}

/* Gaming System Loading */
.gaming-system-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--theme-accent);
}

.gaming-system-loading p {
  margin: 0;
  font-size: 1.1rem;
}

/* Gaming System Cards */
.gaming-system-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.gaming-system-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  border: 2px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.gaming-system-card:hover {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 40%, transparent);
  transform: translateY(-2px);
}

.gaming-system-card.selected {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border-color: var(--theme-accent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.gaming-system-card .card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.gaming-system-card .card-icon .material-symbols-outlined {
  font-size: 1.5rem;
  color: var(--theme-bg-surface);
}

.gaming-system-card .card-content {
  flex: 1;
  min-width: 0;
}

.gaming-system-card .card-content h4 {
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1.1rem;
  font-weight: 600;
}

.gaming-system-card .card-description {
  color: #aaa;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gaming-system-card .card-check {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: var(--theme-success);
}

.gaming-system-card .card-check .material-symbols-outlined {
  font-size: 1.5rem;
}

/* Gaming System Detail (selected) */
.gaming-system-detail {
  margin-top: 1.5em;
  padding: 1.5em;
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5em;
}

.gaming-system-detail h4 {
  color: var(--theme-accent);
  margin: 0 0 1em 0;
  font-size: 1.2em;
  font-weight: 600;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  padding-bottom: 0.5em;
}

/* Shop Items Loading */
.shop-items-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--theme-accent);
}

.shop-items-loading p {
  margin: 0;
  font-size: 1.1rem;
}

/* No Purchased Items */
.no-purchased-items {
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.75rem;
}

.no-purchased-items .empty-icon {
  font-size: 3rem;
  color: #666;
  margin-bottom: 1rem;
}

.no-purchased-items .empty-icon .material-symbols-outlined {
  font-size: 3rem;
}

.no-purchased-items h4 {
  color: var(--theme-accent);
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.no-purchased-items p {
  color: #aaa;
  margin: 0 0 0.5rem 0;
  line-height: 1.6;
}

.no-purchased-items a {
  color: #3498db;
  text-decoration: underline;
}

.no-purchased-items a:hover {
  color: #5dade2;
}

/* Shop Item Cards */
.shop-item-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.shop-item-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  border: 2px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.shop-item-card:hover {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.shop-item-card.selected {
  background: color-mix(in srgb, var(--theme-success) 10%, transparent);
  border-color: var(--theme-success);
}

.shop-item-card .card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.shop-item-card .card-icon .material-symbols-outlined {
  font-size: 1.25rem;
  color: var(--theme-accent);
}

.shop-item-card.selected .card-icon {
  background: color-mix(in srgb, var(--theme-success) 20%, transparent);
}

.shop-item-card.selected .card-icon .material-symbols-outlined {
  color: var(--theme-success);
}

.shop-item-card .card-content {
  flex: 1;
  min-width: 0;
}

.shop-item-card .card-content h4 {
  margin: 0 0 0.25rem 0;
  color: var(--theme-accent);
  font-size: 1rem;
  font-weight: 600;
}

.shop-item-card.selected .card-content h4 {
  color: var(--theme-success);
}

.shop-item-card .card-description {
  color: #aaa;
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.shop-item-card .card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.shop-item-card .item-tag {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.25rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  color: var(--theme-accent);
}

.shop-item-card .card-toggle {
  flex-shrink: 0;
  color: #666;
  transition: color 0.2s ease;
}

.shop-item-card .card-toggle .material-symbols-outlined {
  font-size: 2rem;
}

.shop-item-card.selected .card-toggle {
  color: var(--theme-success);
}

/* Activated Summary */
.activated-summary {
  background: color-mix(in srgb, var(--theme-success) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-success) 30%, transparent);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}

.activated-summary h4 {
  margin: 0 0 0.75rem 0;
  color: var(--theme-success);
  font-size: 1rem;
  font-weight: 600;
}

.activated-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.activated-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: color-mix(in srgb, var(--theme-success) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-success) 40%, transparent);
  border-radius: 1rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  color: var(--theme-success);
}

.activated-chip .remove-chip {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--theme-success);
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.activated-chip .remove-chip:hover {
  opacity: 1;
}

.activated-chip .remove-chip .material-symbols-outlined {
  font-size: 1rem;
}

.activated-chip.locked {
  background: rgba(155, 89, 182, 0.2);
  border-color: rgba(155, 89, 182, 0.4);
  color: #9b59b6;
}

.activated-chip .lock-icon {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* Locked shop item card */
.shop-item-card.locked {
  cursor: default;
  border-color: rgba(155, 89, 182, 0.4);
}

.shop-item-card.locked .card-toggle {
  color: #9b59b6;
}

/* Gaming System Description */
.gaming-system-description {
  margin-top: 1.5em;
  padding: 1.5em;
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5em;
}

.gaming-system-description h4 {
  color: var(--theme-accent);
  margin: 0 0 1em 0;
  font-size: 1.2em;
  font-weight: 600;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  padding-bottom: 0.5em;
}

.description-content {
  color: #D2B48C;
  line-height: 1.6;
  font-size: 0.95em;
}

.description-content :deep(h1),
.description-content :deep(h2),
.description-content :deep(h3),
.description-content :deep(h4),
.description-content :deep(h5),
.description-content :deep(h6) {
  color: var(--theme-accent);
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.description-content :deep(p) {
  margin-bottom: 0.75em;
}

.description-content :deep(ul),
.description-content :deep(ol) {
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}

.description-content :deep(strong) {
  color: #fff;
  font-weight: 600;
}

.description-content :deep(a) {
  color: var(--theme-accent);
  text-decoration: underline;
}

.description-content :deep(a:hover) {
  color: #e6b373;
}

/* Review Step */
.review-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5em;
}

.review-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5em;
  padding: 1.5em;
}

.review-section h4 {
  color: var(--theme-accent);
  margin: 0 0 1em 0;
  font-size: 1.1em;
  font-weight: 600;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  padding-bottom: 0.5em;
}

.review-activated-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}

.activated-item-chip {
  background: color-mix(in srgb, var(--theme-success) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-success) 40%, transparent);
  border-radius: 1em;
  padding: 0.4em 0.8em;
  font-size: 0.85em;
  color: var(--theme-success);
}

.no-content-message {
  color: #aaa;
  font-style: italic;
  margin: 0;
}

.review-item {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 1em;
  margin-bottom: 0.75em;
  align-items: start;
}

.review-item:last-child {
  margin-bottom: 0;
}

.review-label {
  color: var(--theme-accent);
  font-weight: 600;
  font-size: 0.9em;
}

.review-value {
  color: #D2B48C;
  word-break: break-word;
}

.review-html {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-radius: 0.3em;
  padding: 0.75em;
  max-height: 200px;
  overflow-y: auto;
}

.review-html :deep(p) {
  margin-bottom: 0.5em;
}

.review-html :deep(p:last-child) {
  margin-bottom: 0;
}

.review-months {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-top: 0.5em;
}

.month-chip {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 1em;
  padding: 0.4em 0.8em;
  font-size: 0.85em;
  color: var(--theme-accent);
}

.review-zodiacs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-top: 0.5em;
}

.zodiac-chip {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 1em;
  padding: 0.4em 0.8em;
  font-size: 0.85em;
  color: #a78bfa;
}

/* Calendar Type Buttons */
.calendar-type-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-calendar-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 2px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  color: var(--theme-accent);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1 1 200px;
  min-width: 200px;
  justify-content: center;
}

.btn-calendar-type:hover {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  transform: translateY(-1px);
}

.btn-calendar-type.active {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-color: var(--theme-accent);
  color: var(--theme-bg-surface);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-calendar-type .material-symbols-outlined {
  font-size: 1.2rem;
}

.calendar-info-section {
  margin: 1.5em 0;
}

.calendar-info {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.3em;
  padding: 1em;
  margin: 0;
  color: #D2B48C;
  font-size: 0.9em;
  line-height: 1.6;
}

.calendar-info strong {
  color: var(--theme-accent);
}

.calendar-customization {
  margin-top: 1.5em;
}

.calendar-customization h4 {
  color: var(--theme-accent);
  margin: 0 0 0.5em 0;
  font-size: 1.1em;
  font-weight: 600;
}

.customization-hint {
  color: #aaa;
  font-size: 0.9em;
  margin: 0 0 1em 0;
  font-style: italic;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1em;
}

.month-field {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.month-field label {
  font-size: 0.9em;
  color: var(--theme-accent);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.month-field input {
  padding: 0.5em;
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  border: 1px solid #444;
  border-radius: 0.25em;
  color: #fff;
}

.month-field .month-name-field {
  text-transform: capitalize;
}

.month-field .abbr-field {
  width: 80px;
  text-transform: uppercase;
}

.month-field .days-field {
  width: 100px;
}

.month-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.month-field-row {
  display: flex;
  gap: 0.5em;
}

.btn-remove-month,
.btn-remove-zodiac {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.4);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #ff6b6b;
  padding: 0;
}

.btn-remove-month:hover,
.btn-remove-zodiac:hover {
  background: rgba(255, 107, 107, 0.3);
  border-color: rgba(255, 107, 107, 0.6);
  transform: scale(1.1);
}

.btn-remove-month .material-symbols-outlined,
.btn-remove-zodiac .material-symbols-outlined {
  font-size: 16px;
}

.customization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5em;
}

.btn-add-item {
  display: flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.5em 1em;
  background: color-mix(in srgb, var(--theme-success) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-success) 40%, transparent);
  border-radius: 0.3em;
  color: var(--theme-success);
  font-weight: 600;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-item:hover {
  background: color-mix(in srgb, var(--theme-success) 30%, transparent);
  border-color: color-mix(in srgb, var(--theme-success) 60%, transparent);
  transform: translateY(-1px);
}

.btn-add-item .material-symbols-outlined {
  font-size: 18px;
}

/* Zodiac Configuration */
.zodiac-customization {
  margin-top: 2em;
  padding-top: 2em;
  border-top: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.zodiac-customization h4 {
  color: var(--theme-accent);
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
}

.btn-configure-zodiac {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.6em 1.2em;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 0.3em;
  color: #a78bfa;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-configure-zodiac:hover {
  background: rgba(139, 92, 246, 0.3);
  border-color: rgba(139, 92, 246, 0.6);
  transform: translateY(-1px);
}

.btn-configure-zodiac .material-symbols-outlined {
  font-size: 20px;
}

.zodiac-config-panel {
  margin-top: 1em;
  padding: 1em;
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 0.5em;
  animation: fadeIn 0.3s ease-in;
}

.zodiac-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1em;
}

.zodiac-field {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.3em;
  padding: 1em;
}

.zodiac-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.zodiac-field label {
  font-size: 0.9em;
  color: var(--theme-accent);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zodiac-field-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  align-items: center;
}

.zodiac-name-field {
  flex: 1 1 150px;
  min-width: 0;
  padding: 0.5em;
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  border: 1px solid #444;
  border-radius: 0.25em;
  color: #fff;
  text-transform: capitalize;
}

.zodiac-end-display {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5em;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.3em;
  padding: 0.5em 0.75em;
  white-space: nowrap;
}

.end-label {
  font-size: 0.8em;
  color: #aaa;
  font-weight: 500;
}

.end-value {
  font-size: 0.9em;
  color: var(--theme-accent);
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.form-section h3 {
  color: var(--theme-accent);
  margin: 0 0 1em 0;
  font-size: 1.3em;
  border-bottom: 1px solid var(--theme-accent);
  padding-bottom: 0.5em;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1em;
}

.form-grid.date-grid {
  grid-template-columns: 2fr 1fr 1fr;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.form-field label {
  color: var(--theme-accent);
  font-weight: 600;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.required {
  color: #ff6b6b;
}

.form-field input,
.form-field textarea,
.form-field select {
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  color: #ffffff;
  border: 1px solid #444;
  border-radius: 0.25em;
  padding: 0.5em;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
  width: 100%;
}

.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 5px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.year-input {
  text-align: center;
  width: 120px;
}

.date-suffix-abbr {
  width: 4em !important;
  text-transform: uppercase;
}

.field-hint {
  color: #aaa;
  font-size: 0.8em;
  font-style: italic;
  margin-top: -0.25em;
}

.date-section {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.date-info {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.3em;
  padding: 1em;
  margin: 0;
  color: var(--theme-accent);
  font-size: 0.9em;
  line-height: 1.4;
}

/* Step Navigation */
.step-navigation {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 0;
  border-top: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  margin-top: 1rem;
}

.nav-spacer {
  flex: 1;
}

.btn-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
  justify-content: center;
}

.btn-previous {
  background: rgba(255, 255, 255, 0.1);
  color: var(--theme-accent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-previous:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.btn-next,
.btn-finish {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-next:hover:not(:disabled),
.btn-finish:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.btn-nav:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--theme-bg-surface);
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 1024px) and (min-width: 769px) {
  .btn-calendar-type {
    flex: 1 1 calc(50% - 0.5rem);
    min-width: calc(50% - 0.5rem);
  }
}

@media (max-width: 768px) {
  .realm-create {
    padding: 1rem;
  }

  .step-indicator {
    padding: 0.5rem 0;
  }

  .step-indicator::before {
    left: 1rem;
    right: 1rem;
  }

  .step-number {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }

  .step-label {
    font-size: 0.75rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid.date-grid {
    grid-template-columns: 1fr;
  }

  .create-header {
    font-size: 1.1em;
    padding: 0.6em 0.8em;
  }

  .step-navigation {
    flex-wrap: wrap;
  }

  .nav-spacer {
    display: none;
  }

  .btn-nav {
    flex: 1;
    min-width: auto;
  }

  .review-item {
    grid-template-columns: 1fr;
    gap: 0.5em;
  }

  .review-label {
    font-size: 0.85em;
  }

  .calendar-type-buttons {
    gap: 0.75rem;
  }

  .btn-calendar-type {
    flex: 1 1 100%;
    min-width: 100%;
    font-size: 0.85rem;
    padding: 0.65rem 0.75rem;
  }

  .btn-calendar-type .material-symbols-outlined {
    font-size: 1.1rem;
  }
}
</style>

<style>
@keyframes realmCreateGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
