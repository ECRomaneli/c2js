let medias = document.querySelectorAll('video, audio');

for (let i = 0; i < medias.length; i++) {
    let media = medias[i];

    let events = 'abort canplay canplaythrough durationchange emptied ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange seeked seeking stalled suspend volumechange waiting', handler = function (e) {
        console.warn(e.type,  media.buffered.length, media.readyState, window.showEvent ? e : '');
    };
    events.split(' ').forEach(function (event) {
        media.addEventListener(event, handler);
    });
}