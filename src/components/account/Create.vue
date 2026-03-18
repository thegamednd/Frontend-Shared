<template>
    <ErrorBoundary>
        <EnhancedForm
            title="Create Your First Realm"
            description="Set up your realm to start your adventure. This will be your primary world where you can invite players and manage campaigns."
            submit-text="Create Realm"
            :validation-schema="validationSchema"
            v-model="formData"
            @submit="createRealm"
        >
            <div class="realm-form-fields">
                <FormField
                    name="Name"
                    label="Realm Name"
                    type="text"
                    placeholder="Enter a unique name for your realm..."
                    hint="Choose a memorable name that represents your world"
                    required
                    :max-length="50"
                    show-char-count
                    v-model="formData.Name"
                />
                
                <FormField
                    name="y"
                    label="Starting Year"
                    type="number"
                    placeholder="1"
                    hint="Set the starting year for your realm's calendar"
                    required
                    :min="1"
                    :max="9999"
                    v-model="formData.Date.y"
                />
                
                <FormField
                    name="Description"
                    label="Realm Description"
                    type="textarea"
                    placeholder="Describe your realm and what adventures await..."
                    hint="This description will be shown to potential party members"
                    :max-length="500"
                    :rows="4"
                    show-char-count
                    v-model="formData.Description"
                />
                
                <FormField
                    name="MaxPlayers"
                    label="Maximum Players"
                    type="number"
                    placeholder="5"
                    hint="Maximum number of players who can join this realm (default: 5)"
                    required
                    :min="1"
                    :max="50"
                    v-model="formData.MaxPlayers"
                />
                
                <FormField
                    name="MaxCharacters"
                    label="Max Characters Total"
                    type="number"
                    placeholder="10"
                    hint="Maximum number of characters allowed in this realm (default: 10)"
                    required
                    :min="1"
                    :max="100"
                    v-model="formData.MaxCharacters"
                />
            </div>
        </EnhancedForm>
    </ErrorBoundary>
</template>

<script setup>
import { reactive } from 'vue';
import { useAccountStore } from '@shared/stores/account';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';
import { useValidation } from '@shared/composables/useValidation';
import EnhancedForm from '@shared/components/forms/EnhancedForm.vue';
import FormField from '@shared/components/forms/FormField.vue';
import ErrorBoundary from '@shared/components/ErrorBoundary.vue';

const accountStore = useAccountStore();
const realmStore = useRealmStore();
const userStore = useUserStore();
const { rules } = useValidation();

const formData = reactive({
    Name: '',
    Description: '',
    Date: {
        y: new Date().getFullYear()
    },
    MaxPlayers: 4,
    MaxCharacters: 10
});

// Validation schema
const validationSchema = {
    Name: [
        rules.required('Realm name is required'),
        rules.minLength(3, 'Realm name must be at least 3 characters'),
        rules.maxLength(50, 'Realm name must be no more than 50 characters'),
        rules.pattern(/^[a-zA-Z0-9\s\-',.!]+$/, 'Realm name contains invalid characters')
    ],
    y: [
        rules.required('Starting year is required'),
        rules.numeric('Please enter a valid year'),
        rules.min(1, 'Year must be at least 1'),
        rules.max(9999, 'Year must be no more than 9999')
    ],
    MaxPlayers: [
        rules.required('Maximum players is required'),
        rules.numeric('Please enter a valid number'),
        rules.min(1, 'Must allow at least 1 player'),
        rules.max(50, 'Maximum of 50 players allowed')
    ],
    MaxCharacters: [
        rules.required('Maximum characters is required'),
        rules.numeric('Please enter a valid number'),
        rules.min(1, 'Must allow at least 1 character'),
        rules.max(100, 'Maximum of 100 characters allowed')
    ]
};

const createRealm = async (data) => {
    // Create account first if it doesn't exist
    if (!accountStore.accountId) {
        await accountStore.create({
            Subdomain: '', // Will be set by backend
        });
    }
    
    // Create the realm
    await realmStore.create({
        Name: data.Name,
        Description: data.Description,
        Date: data.Date,
        MaxPlayers: data.MaxPlayers,
        MaxCharacters: data.MaxCharacters
    });
};
</script>

<style scoped>
.setting {
    margin: 0.5em;
    border: 1px solid #ccc;
    padding: 0.5em;
    border-radius: 0.5em;
    background-color: #0f1321;
}

input, textarea, button {
    background-color: var(--background-color);
}

input[type="text"] {
    max-width: 10em;
}

input#realmName {
    width: 100%;
    max-width: 100%;
}

input#calYear {
    text-align: center;
}
</style>
