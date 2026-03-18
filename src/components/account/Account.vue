<template>
    <section class="harochTalk">
        <h3>Account Information</h3>
        <div class="col-11">
            <div class="col-13">
                <span>Name</span>
                <span>{{ userStore.fullName }}</span>
            </div>
            <div class="col-13">
                <span class="label">Email</span>
                <span>{{ userStore.email }}</span>
            </div>
        </div>
        <div class="col-11" v-if="accountStore.account">
            <div class="col-13">
                <span class="label">Subscription</span>
                <span>{{ accountStore.account.SubscriptionPlan }}</span>
            </div>
            <div class="col-13">
                <span class="label">Realms</span>
                <span>{{ accountStore.account.Realms }}</span>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAccountStore } from '@shared/stores/account';
import { useUserStore } from '@shared/stores/user';

const accountStore = useAccountStore();
const userStore = useUserStore();

// Your script setup content here
</script>

<style scoped>
/* Your styles here */
</style>
