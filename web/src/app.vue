<style></style>

<template>
    <div id="container">
      <ol>
        <li v-for="event in eventsDesc">
          {{ JSON.stringify(event) }}
        </li>
      </ol>
    </div>
</template>

<script>
export default {
  props: [
    'eventStore'
  ],
  data: () => ({
    
  }),
  computed: {
    eventsDesc: function(){
      return this.eventStore.log.slice().reverse();
    }
  }
}
</script>