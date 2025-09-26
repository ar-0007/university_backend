// src/services/schedulerService.js

const getSupabaseClient = require('../utils/supabaseClient');

const schedulerService = {
  /**
   * Publishes scheduled podcasts that are due
   * @returns {Promise<void>}
   */
  publishScheduledPodcasts: async () => {
    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();

      // Find all scheduled podcasts that are due
      const { data: scheduledPodcasts, error } = await supabase
        .from('podcasts')
        .select('podcast_id, title, scheduled_at')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now);

      if (error) {
        console.error('Error fetching scheduled podcasts:', error);
        return;
      }

    


      // Update each podcast to published status
      for (const podcast of scheduledPodcasts) {
        const { error: updateError } = await supabase
          .from('podcasts')
          .update({
            status: 'published',
            published_at: podcast.scheduled_at,
            scheduled_at: null
          })
          .eq('podcast_id', podcast.podcast_id);

        if (updateError) {
          console.error(`Error publishing podcast ${podcast.podcast_id}:`, updateError);
        } else {
          console.log(`Published podcast: ${podcast.title}`);
        }
      }
    } catch (error) {
      console.error('Error in publishScheduledPodcasts:', error);
    }
  },

  /**
   * Starts the scheduler to check for scheduled podcasts every minute
   */
  startScheduler: () => {
    
    // Check every minute for scheduled podcasts
    setInterval(async () => {
      await schedulerService.publishScheduledPodcasts();
    }, 60000); // 60 seconds

    // Also check immediately on startup
    schedulerService.publishScheduledPodcasts();
  }
};

module.exports = schedulerService; 