$ = (selector) -> document.querySelector selector

audio = $ "audio"
img = $ "img"

play = ->
  audio.play()
  img.classList.add "gobbling"
  console.log "gobbling!!!"

reset = ->
  src = audio.src
  img.classList.remove "gobbling"
  audio.src = ""
  audio.src = src

img.addEventListener "click", ->
  reset()
  setTimeout play

audio.addEventListener "ended", reset
audio.addEventListener "pause", reset