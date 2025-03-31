
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(err => {
      console.error('Error playing notification:', err);
    });
  } catch (err) {
    console.error('Could not create audio:', err);
  }
};