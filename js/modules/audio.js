const audioMap = {
    click: new Audio('sounds/click.mp3'),
    flag:  new Audio('sounds/flag.mp3'),
    boom:  new Audio('sounds/explosion.mp3'),
    win:   new Audio('sounds/win.mp3'),
    bgm:   new Audio('sounds/bgm.mp3')
};

audioMap.bgm.loop = true;

export function playSound(key) {
    const audio = audioMap[key];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
}

export function stopBgm() {
    audioMap.bgm.pause();
}

export function startBgm() {
    audioMap.bgm.currentTime = 0;
    audioMap.bgm.play();
}