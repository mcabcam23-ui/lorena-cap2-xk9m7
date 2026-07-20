(function () {
  const MAX_PREVIEW_MS = 30000;
  let activePlayer = null;

  document.querySelectorAll(".music[data-preview]").forEach((block) => {
    const previewUrl = block.dataset.preview;
    const spotifyUrl = block.dataset.spotify;
    if (!previewUrl || !spotifyUrl) return;

    const audio = new Audio(previewUrl);
    const playBtn = block.querySelector(".music__play");
    const openArea = block.querySelector(".music__open");
    const art = block.querySelector(".music__art");
    let stopTimer = null;
    const player = { block, audio, playBtn };

    function setPlaying(playing) {
      block.classList.toggle("is-playing", playing);
      playBtn.classList.toggle("is-playing", playing);
      playBtn.setAttribute(
        "aria-label",
        playing ? "Pausar preview" : "Reproducir preview"
      );
    }

    function clearTimer() {
      if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
      }
    }

    function stop() {
      audio.pause();
      audio.currentTime = 0;
      clearTimer();
      setPlaying(false);
      if (activePlayer === player) activePlayer = null;
    }

    function play() {
      if (activePlayer && activePlayer !== player) {
        activePlayer.stop();
      }

      audio
        .play()
        .then(() => {
          activePlayer = player;
          setPlaying(true);
          clearTimer();
          stopTimer = setTimeout(stop, MAX_PREVIEW_MS);
        })
        .catch(() => {
          openSpotify();
        });
    }

    player.stop = stop;
    player.play = play;

    function openSpotify() {
      stop();
      window.open(spotifyUrl, "_blank", "noopener,noreferrer");
    }

    playBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (audio.paused) play();
      else stop();
    });

    openArea.addEventListener("click", openSpotify);

    art.addEventListener("click", (event) => {
      if (event.target.closest(".music__play")) return;
      openSpotify();
    });

    audio.addEventListener("ended", stop);
  });
})();
