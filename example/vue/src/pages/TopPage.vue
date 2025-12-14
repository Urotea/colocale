<template>
  <div style="padding: 20px; max-width: 600px; margin: 0 auto">
    <h1>Colocale Vue Example</h1>
    
    <div style="margin-bottom: 20px">
      <router-link to="/ja/top" style="margin-right: 10px">日本語</router-link>
      <router-link to="/en/top">English</router-link>
    </div>

    <div style="margin-bottom: 20px">
      <label for="nameInput">Name: </label>
      <input
        id="nameInput"
        v-model="inputText"
        type="text"
        placeholder="Enter your name"
        style="padding: 5px; width: 200px"
      />
    </div>

    <div style="font-size: 1.5em; font-weight: bold">
      {{ greeting }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Locale, createTranslator, pickMessages } from "colocale";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import enCommon from "../../messages/en/common.json";
import jaCommon from "../../messages/ja/common.json";
import { commonTranslations } from "../translations";

const route = useRoute();
const inputText = ref("");

// Get current locale from route
const locale = computed(() => (route.params.locale as string) || "en");

// Compose messages
const allMessages = {
  ja: { common: jaCommon },
  en: { common: enCommon },
};

// Pick messages for current locale
const messages = computed(() =>
  pickMessages(allMessages, commonTranslations, locale.value as Locale)
);

// Create translator
const t = computed(() => createTranslator(messages.value, commonTranslations));

// Compute greeting message
const greeting = computed(() =>
  t.value("greeting", { name: inputText.value || "World" })
);
</script>
