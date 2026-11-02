<template>
  <v-card class="mx-auto">
    <v-card-text>
      <div class="overline mb-4">{{ $t("renderer.dialog.about.title") }}</div>
      <div class="headline mb-1">CaptfEncoder Web</div>
      <div>{{ $t("renderer.dialog.about.desc") }}</div>
      <div class="my-3">
        <v-row no-gutters>
          <v-col cols="12" md="3">{{ $t("renderer.dialog.about.version") }}</v-col>
          <v-col cols="12" md="9">1.0.0</v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12" md="3">{{ $t("renderer.dialog.about.build_date") }}</v-col>
          <v-col cols="12" md="9">2026-11-02</v-col>
        </v-row>
        <v-row no-gutters class="mt-2">
          <v-col cols="12" md="3">{{ $t("renderer.dialog.about.based_on") }}</v-col>
          <v-col cols="12" md="9">
            <a
              href="https://github.com/guyoung/CaptfEncoder"
              target="_blank"
              rel="noopener noreferrer"
            >guyoung/CaptfEncoder</a>
            {{ $t("renderer.dialog.about.secondary_development") }}
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12" md="3">{{ $t("renderer.dialog.about.official_site") }}</v-col>
          <v-col cols="12" md="9">
            <a
              href="https://github.com/guyoung/CaptfEncoder"
              target="_blank"
              rel="noopener noreferrer"
            >github.com/guyoung/CaptfEncoder</a>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12" md="3">{{ $t("renderer.dialog.about.project_repo") }}</v-col>
          <v-col cols="12" md="9">
            <a
              href="https://github.com/CSS-chen/CaptfEncoder-Web"
              target="_blank"
              rel="noopener noreferrer"
            >CSS-chen/CaptfEncoder-Web</a>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: "AboutDialog",
  data: () => {
    return {};
  },
};
</script>
<style scoped></style>
