(function () {
  const MAX_PREVIEW_MS = 30000;
  let activePlayer = null;

  function bindMusicBlock(block) {
    if (block.dataset.musicBound === "1") return;

    const previewUrl = block.dataset.preview;
    const spotifyUrl = block.dataset.spotify;
    if (!previewUrl || !spotifyUrl) return;

    block.dataset.musicBound = "1";

    const audio = new Audio(previewUrl);
    const playBtn = block.querySelector(".music__play");
    const openArea = block.querySelector(".music__open");
    const art = block.querySelector(".music__art");
    if (!playBtn || !openArea) return;

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
      const url = block.dataset.spotify;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }

    playBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (audio.paused) play();
      else stop();
    });

    openArea.addEventListener("click", openSpotify);

    if (art) {
      art.addEventListener("click", (event) => {
        if (event.target.closest(".music__play")) return;
        openSpotify();
      });
    }

    audio.addEventListener("ended", stop);
  }

  function bindAll(root) {
    const scope = root || document;
    scope.querySelectorAll(".music[data-preview]").forEach(bindMusicBlock);
  }

  window.bindMusicPlayers = bindAll;
  window.resetMusicPlayer = function (block) {
    if (!block) return;
    delete block.dataset.musicBound;
    block.classList.remove("is-playing");
    const playBtn = block.querySelector(".music__play");
    if (playBtn) playBtn.classList.remove("is-playing");
    bindMusicBlock(block);
  };

  bindAll(document);
})();
