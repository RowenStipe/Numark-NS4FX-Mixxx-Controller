// A Controller script for the Numark NS4FX DJ Controller for Mixxx

////////////////////////////////////////////////////////////////////////
// JSHint configuration                                               //
////////////////////////////////////////////////////////////////////////
/* global engine                                                      */
/* global script                                                      */
/* global print                                                       */
/* global midi                                                        */
////////////////////////////////////////////////////////////////////////
// VSCode Linux Config                                                //
////////////////////////////////////////////////////////////////////////
/// <refrence path="../../Common/lodash.mixxx.js" />
/// <refrence path="../../Common/midi-components-0.0.js" />

/*
 I don't know why `components` from `midi-components-0.0.js` doesn't load in VS Code.
 I've stopped caring at this point. -Rowen Stipe
*/

//////////////////////////////////////////////////////////////////////
// To Do List
//////////////////////////////////////////////////////////////////////
/*
    Implement:
        - pitch/play
        - scratch banks
*/

// eslint-disable-next-line no-var
var NS4FX = {
    init: function() {},
    shutdown: function() {},
    controller: {
        options: {},
        component: {
            option: {},
            decks: [{}],
            effectUnit: {},
            samplerAll: [],
            browse: {},
            headGain: {}
        },
        sysex: {},
        BrowseKnob: function() {},
        Deck: function() {},
        EffectUnit: function() {},
        Sampler: function() {},
        HeadGain: function() {},
        sendScreenDurationMidi: function() {},
        sendScreenBpmMidi: function() {},
        sendScreenTimeMidi: function() {},
        elapsedToggle: function() {},
        timeElapsedCallback: function() {},
        timeMs: function() {},
        stopScratchTimer: function() {},
        resetScratchTimer: function() {},
        startScratchTimer: function() {},
        scratchDisable: function() {},
        scratchEnable: function() {},
        scratchTimerCallback: function() {},
        wheelTouch: function() {},
        wheelTurn: function() {},
        wheelToggle: function() {},
        deckSwitch: function() {},
        encodeNumToArray: function() {},
        shiftToggle: function() {},
        pflToggle: function() {},
        vuCallback: function() {},
        debugMsg: function() {}
    },
    led: {
        init: function() {},
        shutdown: function() {},
        constants: {},
        msg: function() {},
        zeroUVmeters: function() {}
    }
};

//////////////////////////////////////////////////////////////////////
// Initialization
//////////////////////////////////////////////////////////////////////

/**
* Initalize the controller
*/
NS4FX.init = function(id, debug) {

    midi.sendSysexMsg(NS4FX.controller.sysex.exitDemoMode);
    
    // Initialize controller ID and DEBUG
    NS4FX.controller.id = id;
    NS4FX.controller.options.debug = debug;

    // Browse Knob Component
    NS4FX.controller.component.browse = new NS4FX.controller.BrowseKnob();

    // Create Deck Components
    NS4FX.controller.component.decks = new components.ComponentContainer();
    NS4FX.controller.component.decks[1] = new NS4FX.controller.Deck(1, 0x00); // CL
    NS4FX.controller.component.decks[2] = new NS4FX.controller.Deck(2, 0x01); // CR
    NS4FX.controller.component.decks[3] = new NS4FX.controller.Deck(3, 0x02); // LL
    NS4FX.controller.component.decks[4] = new NS4FX.controller.Deck(4, 0x03); // RL

    // Effect Unit Component
    NS4FX.controller.component.effectUnit = new NS4FX.controller.EffectUnit();

    NS4FX.controller.options.effectsDefaults.forEach(function(effect) {
        var group = '[EffectRack1_EffectUnit' + effect.unit + '_Effect' + effect.slot + ']';
        engine.setParameter(group, 'meta', effect.meta);
        engine.setValue(group, "clear", 1);
        for (var i = 0; i < effect.id; ++i) {
            engine.setValue(group, "effect_selector", 1);
        }
        
    });

    NS4FX.controller.component.samplerAll = new components.ComponentContainer();
    NS4FX.controller.component.samplerAll[1] = new NS4FX.controller.Sampler(1);
    NS4FX.controller.component.samplerAll[2] = new NS4FX.controller.Sampler(5);

    NS4FX.controller.component.sampler = NS4FX.controller.component.samplerAll[1];

    NS4FX.controller.component.headGain = new NS4FX.controller.HeadGain(NS4FX.controller.component.samplerAll)


    // set up two banks of samplers, 4 samplers each
    if (engine.getValue("[App]", "num_samplers") < 8) {
        engine.setValue("[App]", "num_samplers", 8);
    }

    NS4FX.controller.component.effectUnit.effects.forEach(function(effect) {
        var button = NS4FX.controller.component.effectUnit.effectButtons[effect.name];
        if (button && button.trigger) {
            button.trigger();
        }
    });

    NS4FX.controller.component.decks.forEachComponent(function (component) {
        component.trigger();
    });

    NS4FX.led.init();
    NS4FX.led.zeroUVmeters();

    // Give the controller a couple seconds to calm down before requesting the status.
    engine.beginTimer(20000, () => midi.sendSysexMsg(NS4FX.controller.sysex.statusController), true);
};

//////////////////////////////////////////////////////////////////////
// Shutdown
//////////////////////////////////////////////////////////////////////

/**
* Shutdown the controller
*/
NS4FX.shutdown = function () {
    NS4FX.led.shutdown();
    midi.sendSysexMsg(NS4FX.controller.sysex.shutdown);
};

//////////////////////////////////////////////////////////////////////
// User Editable Config options
//////////////////////////////////////////////////////////////////////

/**
 * Configuration option defaults
 */
NS4FX.controller.options = {
    /**
     * Enable wheel on startup?
     */
    enableWheel: engine.getSetting('enable_wheel'), 
    /**
     * Should `Shift + Load` eject the track or load and play?
     */
    shiftLoadEjects: engine.getSetting('shift_eject'),
    /**
     * Show effect parameters if effect is focused?
     * 
     * Unused?
     */
    showFocusedEffectParameters : engine.getSetting('show_focued_effect_param'),
    /**
     * Use effect on decks [1,3] & [2,4] or only active deck?
     */
    onlyActiveDeckEffect: engine.getSetting('only_active_deck_effect'),
    /**
     * Show VU meters from both decks [1,3] & [2,4] or only active decks?
     */
    displayVUFromBothDecks: engine.getSetting('display_vu_from_decks'),

    /**
     * Enable debug messages to console.log
     */
    debugMessages: engine.getSetting('debug_message_enable'),

    /**
     * Debug message verbosity level
     */
    debugVerbosity: engine.getSetting('debug_message_verbose')
};

/**
 * Default effects to load on each effect button
 */
NS4FX.controller.options.effectsDefaults = [
        {unit: 1, slot: 1, id: 9, meta:0.9},    
        {unit: 1, slot: 2, id: 9, meta:0.1},    
        {unit: 1, slot: 3, id: 10, meta:1},     
        {unit: 2, slot: 1, id: 8, meta:1},      
        {unit: 2, slot: 2, id:12, meta:1},      
        {unit: 2, slot: 3, id:18, meta:1}       
    ];

/**
 * Various options and flags used by components
 * 
 * Not user configurable
 */

NS4FX.controller.component.option = {
    deckSearching: [false, false, false, false, false],
    deckTouching: [false, false, false, false, false],
    ignoreDeckSwitch: true,
    scratchTick: [0, 0, 0, 0, 0],
    lastScratchTick: [0, 0, 0, 0, 0],
    scratchTimer: [],
    scratchDirection: [],
    scratchAccumulator: [],
    shift: false,
    wheel: []
};



//////////////////////////////////////////////////////////////////////
// Sysex Messages
//////////////////////////////////////////////////////////////////////

NS4FX.controller.sysex = {

    // 0x00 0x01 0x3F is Numark mfg. ID used in SysEx messages.

    /**
     * Exit demo mode on initalization
     */
    exitDemoMode: [0xF0, 0x00, 0x01, 0x3F, 0x7F, 0x3A, 0x60, 0x00, 0x04, 0x04, 0x01, 0x00, 0x00, 0xF7],
    /**
     * Shutdown message
     */
    shutdown: [0xF0, 0x00, 0x20, 0x7F, 0x02, 0xF7],
    /**
     * Controller state request message
     * 
     * Supposedly, haven't gotten it to work yet. - Rowen
     */
    statusController: [ 0xF0, 0x00, 0x01, 0x3F, 0x38, 0x48, 0xF7]
};

//////////////////////////////////////////////////////////////////////
// Main Component functions
//////////////////////////////////////////////////////////////////////

NS4FX.controller.BrowseKnob = function() {
    this.knob = new components.Encoder({
        group: '[Library]',
        input: function (channel, control, value, status, group) {
            if (value === 1) {
                engine.setParameter(this.group, this.inKey + 'Down', 1);
            } else if (value === 127) {
                engine.setParameter(this.group, this.inKey + 'Up', 1);
            }
        },
        unshift: function() {
            this.inKey = 'Move';
        },
        shift: function() {
            this.inKey = 'Scroll';
        },
    });

    this.button = new components.Button({
        group: '[Library]',
        inKey: 'GoToItem',
        input: function (channel, control, value, status, group) {
            if (value > 0) { // Button gedrückt
                engine.setParameter(this.group, this.inKey, 1);
            }
        },
        unshift: function() {
            this.inKey = 'GoToItem';
        },
        shift: function() {
            this.inKey = 'MoveFocusBackward';
        },
    });
};

NS4FX.controller.BrowseKnob.prototype = new components.ComponentContainer();

NS4FX.controller.Deck = function(deckNumber, midiChannel) {
    var deck = this;
    this.number = deckNumber;
    this.active = (deckNumber == 1 || deckNumber == 2);

    var hotCuePressed = false;
    var playPressedDuringHotCue = false;

    components.Deck.call(this, deckNumber);

    this.bpm = new components.Component({
        outKey: "bpm",
        output: function(value, group, control) {
            NS4FX.controller.sendScreenBpmMidi(deckNumber, Math.round(value * 100));
        },
    });

    this.duration = new components.Component({
        outKey: "duration",
        output: function(duration, group, control) {
            // update duration
            NS4FX.controller.sendScreenDurationMidi(deckNumber, duration * 1000);

            // when the duration changes, we need to update the play position
            deck.position.trigger();
        },
    });

    this.position = new components.Component({
        outKey: "playposition",
        output: function(playposition, group, control) {
            // the controller appears to expect a value in the range of 0-52
            // representing the position of the track. Here we send a message to the
            // controller to update the position display with our current position.
            var pos = Math.round(playposition * 52);
            if (pos < 0) {
                pos = 0;
            }
            midi.sendShortMsg(0xB0 | midiChannel, 0x3F, pos);

            // get the current duration
            var duration = deck.duration.outGetValue();

            // update the time display
            var time = NS4FX.controller.timeMs(deckNumber, playposition, duration);
            NS4FX.controller.sendScreenTimeMidi(deckNumber, time);

            // update the spinner (range 64-115, 52 values)
            //
            // the visual spinner in the mixxx interface takes 1.8 seconds to loop
            // (60 seconds/min divided by 33 1/3 revolutions per min)
            var period = 60 / (33+1/3);
            var midiResolution = 52; // the controller expects a value range of 64-115
            var timeElapsed = duration * playposition;
            var spinner = Math.round(timeElapsed % period * (midiResolution / period));
            if (spinner < 0) {
                spinner += 115;
            } else {
                spinner += 64;
            }

            midi.sendShortMsg(0xB0 | midiChannel, 0x06, spinner);
        },
    });

    this.playButton = new components.PlayButton({
        midi: [0x90 + midiChannel, 0x00],
        off: 0x01,
        sendShifted: true,
        shiftControl: true,
        shiftOffset: 4,
        unshift: function() {
            components.PlayButton.prototype.unshift.call(this);
            this.type = components.Button.prototype.types.toggle;
        },
        shift: function() {
            this.inKey = 'play_stutter';
            this.type = components.Button.prototype.types.push;
        },
        input: function(channel, control, value, status, group) {
            if (this.isShifted) {
                // Shift mode logic
                if (value === 0x7F) {
                    engine.setValue(group, "play_stutter", 1);
                } else {
                    engine.setValue(group, "play_stutter", 0);
                }
            } else {
                // Normal mode logic
                if (value === 0x7F) {
                    if (hotCuePressed) {
                        playPressedDuringHotCue = true;
                    } else {
                        var currentPlayState = engine.getValue(group, "play");
                        // engine.setValue expects a numeric value; convert boolean inversion to 0/1
                        engine.setValue(group, "play", currentPlayState ? 0 : 1);
                    }
                }
            }
        }
    });

    this.load = new components.Button({
        inKey: 'LoadSelectedTrack',
        shift: function() {
            if (NS4FX.controller.options.shiftLoadEjects) {
                this.inKey = 'eject';
            }
            else {
                this.inKey = 'LoadSelectedTrackAndPlay';
            }
        },
        unshift: function() {
            this.inKey = 'LoadSelectedTrack';
        },
    });

    this.cueButton = new components.CueButton({
        midi: [0x90 + midiChannel, 0x01],
        off: 0x01,
        sendShifted: true,
        shiftControl: true,
        shiftOffset: 4,
    });

    this.syncButton = new components.SyncButton({
        midi: [0x90 + midiChannel, 0x02],
        off: 0x01,
        sendShifted: true,
        shiftControl: true,
        shiftOffset: 1,
    });

    this.pflButton = new components.Button({
        midi: [0x90 + midiChannel, 0x1B],
        key: 'pfl',
        off: 0x01,
        type: components.Button.prototype.types.toggle,
        connect: function() {
            components.Button.prototype.connect.call(this);
            this.connections[1] = engine.makeConnection(this.group, this.outKey, NS4FX.controller.pflToggle.bind(this));
        },
    });

    //HOTCUES
    this.hotcueButtons = new components.ComponentContainer();
    this.hotcueButtonsSecondary = new components.ComponentContainer();
    this.rollButtons =  new components.ComponentContainer();
    this.slicerButtons = new components.ComponentContainer();

    this.samplerButtons = new components.ComponentContainer({
        updateLEDs : function() {
            for (let button in deck.samplerButtons) {
                if (this[button] instanceof components.SamplerButton) {
                    const samplerGroup = `[Sampler${this[button].number}]`; // Group corresponding samplers
                    const isTrackLoaded = engine.getValue(samplerGroup, 'track_loaded'); // Check if track is loaded
                    // Light up LED when track is loaded
                    deck.samplerButtons[button].output(isTrackLoaded ? 1 : 0);
                }
            }
        }
    });

    this.fadercutsButtons = new components.ComponentContainer({
        updateLEDs: function(deckGroup){
            for (let button in deck.fadercutsButtons) {
                if (deck.fadercutsButtons[button] instanceof components.Button) {
                    deck.fadercutsButtons[button].output(0);
                }
            }
        }
    });

    this.autoloopButtons = new components.ComponentContainer({
        updateLEDs: function(deckGroup) {
            for (let button in deck.autoloopButtons) { // 
                if (deck.autoloopButtons[button] instanceof components.Button) {
                    const loopLength = Math.pow(2, 5 - deck.autoloopButtons[button].number); // Berechne Loop-Länge für den Button
                    const currentLoopLength = engine.getValue(deckGroup, 'beatloop_size');
                    const isActive = engine.getValue(deckGroup, 'loop_enabled') && currentLoopLength === loopLength; // Prüfe ob der Loop aktiv ist und die Länge übereinstimmt
                    
                    deck.autoloopButtons[button].output(isActive ? 1 : 0); // LED an/aus basierend auf Zustand
                }
            }
        }
    });

    for (var i = 1; i <= 4; ++i) {
        this.hotcueButtons[i] = new components.HotcueButton({
            midi: [0x94 + midiChannel, 0x17 + i],
            number: i,
            output: function(value) {
                midi.sendShortMsg(this.midi[0], this.midi[1], value ? 0x7F : 0x01); // Zweites Byte  
            }     
        });

        //cue buttons 5 - 8
        this.hotcueButtonsSecondary[5-i] = new components.HotcueButton({
            midi: [0x94 + midiChannel, 0x18 - i],
            number: 9-i,
            output: function(value) {
                midi.sendShortMsg(this.midi[0], this.midi[1], value ? 0x7F : 0x01);
            },
        });
        
        var samplerOffset;
        //sampler buttons
        if (deck.number % 2 == 0){
            samplerOffset = 4;
        } else {
            samplerOffset = 0;
        }
        this.samplerButtons[5-i] = new components.SamplerButton({
            midi: [0x94 + midiChannel, 0x18- i],
            number: 5-i+samplerOffset,
            loaded: 0x5,
            playing: 0x7F
        });

        // TODO: Translate
        this.fadercutsButtons[5 - i] = new components.Button({
            midi: [0x94 + midiChannel, 0x18 - i], // Bitwise midi 
            input: function(channel, control, value, status) {
                const deckGroup = `[Channel${deck.number}]`; // Deck group based on deck number
    
                if (value === 0x7F) { // Button pressed
                    const bpm = engine.getValue(deckGroup, 'bpm'); // Get track BPM
                    const baseInterval = (60 / bpm) * 1000 / 4; // Calculate the beat interval in milliseconds
                    
                    // Speed based on button number
                    const speedMultiplier = this.number; // Button 1 = slow, Button 4 = fast
                    const interval = baseInterval / speedMultiplier; // Geschwindigkeit anpassen
                    
                    console.log(`BPM=${bpm}, Base Interval=${baseInterval}ms, Speed Multiplier=${speedMultiplier}, Final Interval=${interval}ms`);
    
                    this.startFaderCuts(deckGroup, interval); // Cuts mit berechneter Geschwindigkeit starten
    
                    this.output(1); // LED activate
                } else {
                    this.stopFaderCuts(deckGroup); // Stoppe Fadercuts
    
                    this.output(0); // LED deactivate
                }
            },
            output: function(value) {
                midi.sendShortMsg(this.midi[0], this.midi[1], value ? 0x7F : 0x01); // LED an/aus
            },
            startFaderCuts: function(deckGroup, interval) {
                let toggle = false;
    
                this.faderCutInterval = engine.beginTimer(interval, () => {
                    toggle = !toggle; 
                    
                    const newVolume = toggle ? 1 : 0; // Wechsel zwischen voller Lautstärke und Stille
                    
                    console.log(`Toggle=${toggle}, New Volume=${newVolume}`);
                    
                    engine.setValue(deckGroup, 'volume', newVolume);
                });
    
                console.log(`Timer started with interval ${interval}ms`);
            },
            stopFaderCuts: function(deckGroup) {
                if (this.faderCutInterval) {
                    engine.stopTimer(this.faderCutInterval);
                    this.faderCutInterval = null;
                }
    
                engine.setValue(deckGroup, 'volume', 1); 
                console.log(`Resetting volume for ${deckGroup} to 1`);
            },
            number: i 
        });

        this.autoloopButtons[5 - i] = new components.Button({
            midi: [0x94 + midiChannel, 0x18 - i], // MIDI address
            input: function(channel, control, value, status) {
                var deckGroup = `[Channel${deck.number}]`; // Deck group based on deck number
                
                if (value === 0x7F) { // Button pressed
                    // Control the length of the loop based on the button number.
                    var loopLength = Math.pow(2, 5 - this.number); // Button 1 = 1 Beat, Button 2 = 2 Beats usw.
                    
                    // Check current state of the loop
                    var currentLoopLength = engine.getValue(deckGroup, 'beatloop_size');
                    var isLoopActive = engine.getValue(this.group, "loop_enabled");// Prüfe ob ein Loop aktiv ist
                    
                    if (!isLoopActive || currentLoopLength !== loopLength) {
                        // If no loop is active or the length changes, set the new length and activate the loop
                        engine.setValue(deckGroup, 'beatloop_size', loopLength);
                        if (!isLoopActive){
                            console.log("not active");
                            deck.loopControls.loop_toggle.input(0,0,0x7F,0);
                        }else{
                            engine.setValue(deckGroup, 'loop_enabled', 1); // Activated loop
                            }
                    }else{
                        engine.setValue(deckGroup, 'loop_enabled', 0);
                    }
                    
                    deck.autoloopButtons.updateLEDs(deckGroup);
                }
            },
            output: function(value) {
                midi.sendShortMsg(this.midi[0], this.midi[1], value ? 0x7F : 0x01); // LED an/aus
            },
            number: i // Speichert die Nummer des Buttons (1–4)
        });
        
        const rollDuration = Math.pow(2, -(i)); // Berechnet die Loop Roll Dauer (0.5, 0.25, 0.125, 0.0625)
        const rollDurationString = rollDuration.toFixed(4).replace(/0+$/, '');
        this.rollButtons[5 - i] = new components.Button({
            midi: [0x94 + midiChannel, 0x18 - i], // MIDI-Adresse für die Buttons
            number: 5 - i, // Button-Nummer (1 bis 4)
            inKey: `beatlooproll_${rollDurationString}_activate`, // Automatisch berechneter inKey
            outKey: `beatloop_${rollDurationString}_enabled`,
        });
    
    }

    this.changePadMode = (padmode) => {
        let buttons;
        this.padmode_str = padmode;
        if (padmode == "hotcue"){
            buttons = this.hotcueButtonsSecondary;
        } else if (padmode == "sampler"){
            deck.samplerButtons.updateLEDs(`[Channel${this.number}]`);
            buttons = this.samplerButtons;
        } else if (padmode == "autoloop"){
            deck.autoloopButtons.updateLEDs(`[Channel${this.number}]`);
            buttons = this.autoloopButtons;
        } else if (padmode == "fadercuts"){
            deck.fadercutsButtons.updateLEDs(`[Channel${this.number}]`);
            buttons = this.fadercutsButtons;
        } else if (padmode == "pitchplay"){
            // TODO: Implement pitchplay
            console.log("not implemented yet");
            buttons = this.hotcueButtonsSecondary;
        } else if (padmode == "roll"){
            buttons = this.rollButtons;
        } else if (padmode == "slicer"){
            buttons = this.slicerButtons;
        } else if (padmode == "scratchbanks"){
            // TODO: Implement scratchbanks
            console.log("not implemented yet");
            buttons = this.hotcueButtonsSecondary;
        }
        this.hotcues.forEachComponent(function(component) {
            component.disconnect();
        });
        this.hotcues = buttons;
        this.hotcues.reconnectComponents();
    };
    // Provide alias used elsewhere in the code (change_padmode)
    this.change_padmode = this.changePadMode;
    this.hotcues = this.hotcueButtonsSecondary;
    this.padModeSTR = "hotcue";
    this.changePadMode("hotcue");
    this.pitch = new components.Pot({
        inKey: 'rate',
        invert: true,
    });
    if (!this.active) {
        this.pitch.firstValueReceived = true;
    }

    var pitchOKeylock = function (channel, control, value, status, group) {
        if (value === 0) { 
            // Taste losgelassen → Vererbung an Standard-Button
            components.Button.prototype.input.call(this, channel, control, value, status, group);
            return;
        }
    
        if (this.other.inGetValue() > 0.0 && this.isPress(channel, control, value, status)) {
            // Beide Pitch-Tasten gedrückt → Keylock umschalten
            NS4FX.controller.toggleControl(this.group, "keylock");
        } else {
            // Normales Pitch-Bending
            components.Button.prototype.input.call(this, channel, control, value, status, group);
        }
    };
    
    this.pitchBendUp = new components.Button({
        inKey: 'rate_temp_up',
        input: pitchOKeylock,
    });

    this.pitchBendDown = new components.Button({
        inKey: 'rate_temp_down',
        input: pitchOKeylock,
    });

    // TODO: Note What's this other?
    this.pitchBendUp.other = this.pitchBendDown;
    this.pitchBendDown.other = this.pitchBendUp;

    this.keyUp = new components.Button({
        inKey: 'pitch_up',
        direction: 1,
        input: keyUpOrDown,
    });
    this.keyDown = new components.Button({
        inKey: 'pitch_down',
        direction: -1,
        input: keyUpOrDown,
    });
    this.keyUp.other = this.keyDown;
    this.keyDown.other = this.keyUp;

    var pitchOKeylock = function (channel, control, value, status, group) {
        if (value === 0) { 
            // Taste losgelassen → Vererbung an Standard-Button
            components.Button.prototype.input.call(this, channel, control, value, status, group);
            return;
        }
    
        if (this.other.inGetValue() > 0.0 && this.isPress(channel, control, value, status)) {
            // Beide Pitch-Tasten gedrückt → Keylock umschalten
            script.toggleControl(this.group, "keylock");
        } else {
            // Normales Pitch-Bending
            components.Button.prototype.input.call(this, channel, control, value, status, group);
        }
    };
    
    this.pitchBendUp = new components.Button({
        inKey: 'rate_temp_up',
        input: pitchOKeylock,
    });

    this.pitchBendDown = new components.Button({
        inKey: 'rate_temp_down',
        input: pitchOKeylock,
    });

    this.pitchBendUp.other = this.pitchBendDown;
    this.pitchBendDown.other = this.pitchBendUp;

    var keyUpOrDown = function (channel, control, value, status, group) {
        this.is_pressed = this.isPress(channel, control, value, status);
        if (this.is_pressed) {
            if (this.other.is_pressed) {
                // reset if both buttons are pressed
                engine.setValue(deck.currentDeck, "pitch_adjust", 0.0);
            }
            else {
                this.inSetValue(1.0);
            }
        }
    };
    this.keyUp = new components.Button({
        inKey: 'pitch_up',
        direction: 1,
        input: keyUpOrDown,
    });
    this.keyDown = new components.Button({
        inKey: 'pitch_down',
        direction: -1,
        input: keyUpOrDown,
    });
    this.keyUp.other = this.keyDown;
    this.keyDown.other = this.keyUp;

    //PAD MODE
    this.padMode = new components.ComponentContainer({
        padHotcue: new components.Button({
            midi: [0x94 + midiChannel, 0x00], // MIDI-Adresse für Hotcue-Modus
            input: function(channel, control, value, status) {
                if (value === 0x7F) { // Button gedrückt
                    this.groupContainer.turnOffOtherButtons(this); // Deaktiviert andere LEDs
                    this.output(1); // Aktiviert LED für diesen Modus
                    // Logik für Hotcue-Modus aktivieren
                    deck.change_padmode("hotcue");
                }
            },
            output: function(value) {
                this.send(value ? 0x7F : 0x01); // LED an/aus
            }
        }),
        pad_autoloop: new components.Button({
            midi: [0x94 + midiChannel, 0x0D], // MIDI-Adresse für Autoloop-Modus
            input: function(channel, control, value, status) {
                if (value === 0x7F) { // Button gedrückt
                    this.groupContainer.turnOffOtherButtons(this);
                    this.output(1); 
                    deck.change_padmode("autoloop");
                }
            },
            output: function(value) {
                this.send(value ? 0x7F : 0x01);
            }
        }),
        pad_fadercuts: new components.Button({
            midi: [0x94 + midiChannel, 0x07], // MIDI-Adresse für Fadercuts-Modus
            input: function(channel, control, value, status) {
                if (value === 0x7F) {
                    this.groupContainer.turnOffOtherButtons(this);
                    this.output(1);
                    deck.change_padmode("fadercuts");
                }
            },
            output: function(value) {
                this.send(value ? 0x7F : 0x01);
            }
        }),
        pad_sample: new components.Button({
            midi: [0x94 + midiChannel, 0x0B], // MIDI-Adresse für Sample-Modus
            input: function(channel, control, value, status) {
                if (value === 0x7F) {
                    this.groupContainer.turnOffOtherButtons(this);
                    this.output(1);
                    deck.change_padmode("sampler");
                }
            },
            output: function(value) {
                this.send(value ? 0x7F : 0x01);
            }
        }),
        pad_pitchplay: new components.Button({
            midi: [0x94 + midiChannel, 0x02], // MIDI-Adresse für Sample-Modus
            input: function(channel, control, value, status) {
                if (value === 0x7F) {
                    this.groupContainer.turnOffOtherButtons(this);
                    this.output(1);
                    deck.change_padmode("pitchplay");
                }
            },
            output: function(value) {
                this.send(value ? 0x7F : 0x01);
            }
        }),
        pad_roll: new components.Button({
            midi: [0x94 + midiChannel, 0x06], // MIDI-Adresse für Sample-Modus
            input: function(channel, control, value, status) {
                if (value === 0x7F) {
                    this.groupContainer.turnOffOtherButtons(this);
                    this.output(1);
                    deck.change_padmode("roll");
                }
            },
            output: function(value) {
                this.send(value ? 0x7F : 0x01);
            }
        }),
        pad_slicer: new components.Button({
            midi: [0x94 + midiChannel, 0x0E], // MIDI-Adresse für Sample-Modus
            input: function(channel, control, value, status) {
                if (value === 0x7F) {
                    this.groupContainer.turnOffOtherButtons(this);
                    this.output(1);
                    deck.change_padmode("slicer");
                }
            },
            output: function(value) {
                this.send(value ? 0x7F : 0x01);
            }
        }),
        pad_scratchbanks: new components.Button({
            midi: [0x94 + midiChannel, 0x0F], // MIDI-Adresse für Sample-Modus
            input: function(channel, control, value, status) {
                if (value === 0x7F) {
                    this.groupContainer.turnOffOtherButtons(this);
                    this.output(1);
                    deck.change_padmode("scratchbanks");
                }
            },
            output: function(value) {
                this.send(value ? 0x7F : 0x01);
            }
        }),
        turnOffOtherButtons: function(activeButton) {
            for (var button in this) {
                if (this[button] instanceof components.Button && this[button] !== activeButton) {
                    this[button].output(0); // Schaltet LEDs anderer Buttons aus
                }
            }
        }
    });
    
    // Sicherstellen, dass die Buttons Zugriff auf den Container haben
    for (var button in this.padMode) {
        if (this.padMode[button] instanceof components.Button) {
            this.padMode[button].groupContainer = this.padMode; // Container-Referenz setzen
        }
        this.padMode.padHotcue.output(1);

        //LOOP
        this.loopControls = new components.ComponentContainer({
            loop_halve: new components.Button({
                midi: [0x94 + midiChannel, 0x34],
                input: function(channel, control, value, status) {
                    if (value === 0x7F) { // Button pressed
                        engine.setValue(this.group, "loop_halve", 1);
                        this.output(1);
                    } else if (value === 0x00) { // Button released
                        this.output(0);
                        if (deck.padmode_str == "autoloop"){
                            deck.autoloopButtons.updateLEDs(this.group);
                        }
                    }
                },
                output: function(value) {
                    this.send(value ? 0x7F : 0x01);
                }
            }),
            
            loop_double: new components.Button({
                midi: [0x94 + midiChannel, 0x35],
                input: function(channel, control, value, status) {
                    if (value === 0x7F) { // Button pressed
                        engine.setValue(this.group, "loop_double", 1);
                        this.output(1);
                    } else if (value === 0x00) { // Button released
                        this.output(0);
                        if (deck.padmode_str == "autoloop"){
                            deck.autoloopButtons.updateLEDs(this.group);
                        }
                    }
                },
                output: function(value) {
                    this.send(value ? 0x7F : 0x01);
                }
            }),
            
            loop_in: new components.Button({
                midi: [0x94 + midiChannel, 0x36],
                input: function(channel, control, value, status) {
                    if (value === 0x7F) { // Button pressed
                        engine.setValue(this.group, "loop_in", 1);
                        this.output(1);
                    } else if (value === 0x00) { // Button released
                        engine.setValue(this.group, "loop_in", 0);
                        this.output(0);
                    }
                },
                output: function(value) {
                    this.send(value ? 0x7F : 0x01);
                }
            }),
            
            loop_out: new components.Button({
                midi: [0x94 + midiChannel, 0x37],
                input: function(channel, control, value, status) {
                    if (value === 0x7F) { // Button pressed
                        engine.setValue(this.group, "loop_out", 1);
                        this.output(1);
                    } else if (value === 0x00) { // Button released
                        engine.setValue(this.group, "loop_out", 0);
                        this.output(0);
                    }
                },
                output: function(value) {
                    this.send(value ? 0x7F : 0x01);
                }
            }),
            reloop: new components.Button({
                midi: [0x94 + midiChannel, 0x41],
                input: function(channel, control, value, status) {
                    if (value === 0x7F) { // Button pressed
                        var loopEnabled = engine.getValue(this.group, "loop_enabled");
                        if (loopEnabled) {
                            // Wenn der Loop aktiv ist, deaktivieren wir ihn
                            engine.setValue(this.group, "loop_enabled", 0);
                        } else {
                            // Wenn kein Loop aktiv ist, aktivieren wir den letzten Loop
                            engine.setValue(this.group, "reloop_toggle", 1);
                        }
                        this.output(1);
                    } else if (value === 0x00) { // Button released
                        this.output(0);
                    }
                },
                output: function(value) {
                    this.send(value ? 0x7F : 0x01);
                },
                connect: function() {
                    this.connections.push(
                        engine.makeConnection(this.group, "loop_enabled", function(value) {
                            this.output(value);
                        }.bind(this))
                    );
                }
            }),
            
            loop_toggle: new components.Button({
                midi: [0x94 + midiChannel, 0x40],
                input: function(channel, control, value, status) {
                    if (value === 0x7F) { // Button pressed
                        var loopEnabled = engine.getValue(this.group, "loop_enabled");
                        var loopStartPosition = engine.getValue(this.group, "loop_start_position");
                        var loopEndPosition = engine.getValue(this.group, "loop_end_position");
                        var currentPosition = engine.getValue(this.group, "playposition");
                        var trackSamples = engine.getValue(this.group, "track_samples");
                        
                        // Konvertiere currentPosition zu Samples
                        var currentSamplePosition = currentPosition * trackSamples;
                        
                        if (loopEnabled) {
                            // Wenn ein Loop aktiv ist, deaktivieren wir ihn
                            engine.setValue(this.group, "loop_enabled", 0);
                        } else if (loopStartPosition >= 0 && loopEndPosition > loopStartPosition &&
                                currentSamplePosition >= loopStartPosition && currentSamplePosition <= loopEndPosition) {
                            // Wenn wir uns innerhalb eines definierten Loops befinden, aktivieren wir ihn
                            engine.setValue(this.group, "loop_enabled", 1);
                        } else {
                            // Ansonsten setzen wir einen neuen Loop
                            engine.setValue(this.group, "beatloop_activate", 1);
                        }
                        if (deck.padmode_str == "autoloop"){
                            var deckGroup = `[Channel${deck.number}]`; // Deck-Gruppe basierend auf Deck-Nummer
                            deck.autoloopButtons.updateLEDs(deckGroup);
                        }
                    }
                },
                output: function(value) {
                    this.send(value ? 0x7F : 0x01);
                },
                connect: function() {
                    this.connections.push(
                        engine.makeConnection(this.group, "loop_enabled", function(value) {
                            this.output(value);
                        }.bind(this)),
                        engine.makeConnection(this.group, "track_loaded", function() {
                            var loopEnabled = engine.getValue(this.group, "loop_enabled");
                            this.output(loopEnabled);
                        }.bind(this))
                    );
                }
            }) 
        });

        this.EqEffectKnob = function (group, in_key, fx_key, filter_knob) {
            this.unshift_group = group;
            this.unshift_key = in_key;
            this.fx_key = fx_key;
            if (filter_knob) {
                this.shift_key = 'super1';
            }
            this.ignore_next = null;
            components.Pot.call(this, {
                group: group,
                inKey: in_key,
            });
        };
        this.EqEffectKnob.prototype = new components.Pot({
            input: function (channel, control, value, status, group) {
                // if the control group and key has changed, ignore_next will hold
                // the old settings. We need to tell the soft takeover engine to
                // ignore the next values for that control so that when we
                // eventually switch back to it, soft takeover will manage it
                // properly.
                //
                // We call IgnoreNextValue() here instead of in shift()/unshift()
                // (via connect()/disconnect()) because if we did that, pressing
                // the shift key would cause the next value on the control to be
                // ignored even if the control wasn't moved, which would trigger
                // a phantom soft takeover if the control was moved fast enough. We
                // only need to IgnoreNextValue() if the control has actually moved
                // after switching the target group/key.
                if (this.ignore_next) {
                    engine.softTakeoverIgnoreNextValue(this.ignore_next.group, this.ignore_next.key);
                    this.ignore_next = null;
                }
                components.Pot.prototype.input.call(this, channel, control, value, status, group);
            },
            connect: function() {
                // enable soft takeover on our controls
                for (var i = 1; i <= 3; i++) {
                    var group = '[EffectRack1_EffectUnit1_Effect' + i + ']';
                    engine.softTakeover(group, this.fx_key, true);
                }
                components.Pot.prototype.connect.call(this);
            },        
            shift: function() {
                var focused_effect = engine.getValue('[EffectRack1_EffectUnit1]', "focused_effect");
                if (focused_effect === 0) {
                    if (this.shift_key) {
                        engine.softTakeover('[EffectRack1_EffectUnit1]', this.shift_key, true);
                        this.switchControl('[EffectRack1_EffectUnit1]', this.shift_key);
                    }
                } else {
                    var group = '[EffectRack1_EffectUnit1_Effect' + focused_effect + ']';
                    this.switchControl(group, this.fx_key);
                }
            },
            
            unshift: function() {
                this.switchControl(this.unshift_group, this.unshift_key);
            },
            switchControl: function(group, key) {
                if (this.group != group || this.inKey != key) {
                    this.ignore_next = { 'group': this.group, 'key': this.inKey };
                }
                this.group = group;
                this.inKey = key;
            },
        });

        var eqGroup = '[EqualizerRack1_' + this.currentDeck + '_Effect1]';
        this.highEQ = new this.EqEffectKnob(eqGroup, 'parameter3', 'parameter3');
        this.midEQ = new this.EqEffectKnob(eqGroup, 'parameter2', 'parameter4');
        this.lowEQ = new this.EqEffectKnob(eqGroup, 'parameter1', 'parameter5');

        this.filter = new this.EqEffectKnob(
        '[QuickEffectRack1_' + this.currentDeck + ']',
        'super1',
        'parameter1',
        true);

        this.gain = new this.EqEffectKnob(
        this.currentDeck,
        'pregain',
        'parameter2');


        this.reconnectComponents(function (c) {
            if (c.group === undefined) {
                c.group = deck.currentDeck;
            }
        });

        this.setActive = function(active) {
            this.active = active;

            if (!active) {
                // trigger soft takeover on the pitch control
                this.pitch.disconnect();
            }
        };
    };
};

NS4FX.controller.Deck.prototype = new components.Deck();

NS4FX.controller.EffectUnit = function() {
    var self = this;
    this.deck1 = true;
    this.deck2 = true;
    this.switch_active_left = false;
    this.switch_active_right = false;

    this.toggleEffect = function(effectName) {
        var effect = this.effects.find(e => e.name === effectName);
        if (!effect) return;

        var group = '[EffectRack1_EffectUnit' + effect.unit + '_Effect' + 
                    (this.effects.filter(e => e.unit === effect.unit).indexOf(effect) + 1) + ']';

        // Falls derselbe Effekt gedrückt wird, deaktiviere ihn
        if (this.activeEffect === effectName) {
            engine.setValue(group, 'enabled', 0);
            this.activeEffect = null;
        } else {
            // Deaktiviere alle Effekte
            this.effects.forEach(function(e) {
                var effGroup = '[EffectRack1_EffectUnit' + e.unit + '_Effect' + 
                               (self.effects.filter(x => x.unit === e.unit).indexOf(e) + 1) + ']';
                engine.setValue(effGroup, 'enabled', 0);
            });

            // Aktiviere den neuen Effekt
            engine.setValue(group, 'enabled', 1);
            this.activeEffect = effectName;
        }

        this.updateEffectButtons();
    };

    this.updateEffectButtons = function() {
        var self = this;
        this.effects.forEach(function(effect) {
            var group = '[EffectRack1_EffectUnit' + effect.unit + '_Effect' + 
                        (self.effects.filter(e => e.unit === effect.unit).indexOf(effect) + 1) + ']';
            var isEnabled = engine.getValue(group, 'enabled');
            self.effectButtons[effect.name].output(isEnabled ? 0x7F : 0x00);
        });
    };

    this.dryWetKnob = new components.Pot({
        midi: [0xB8, 0x04],
        group: '[EffectRack1_EffectUnit1]',
        inKey: 'mix',
        input: function(channel, control, value, status, group) {
            var newValue = value / 127;
            engine.setValue('[EffectRack1_EffectUnit1]', 'mix', newValue);
            engine.setValue('[EffectRack1_EffectUnit2]', 'mix', newValue);
        }
    });

    this.effects = [
        {name: 'hpf', status: 0x98, control: 0x00, unit: 1},
        {name: 'lpf', status: 0x98, control: 0x01, unit: 1},
        {name: 'flanger', status: 0x98, control: 0x02, unit: 1},
        {name: 'echo', status: 0x99, control: 0x03, unit: 2},
        {name: 'reverb', status: 0x99, control: 0x04, unit: 2},
        {name: 'phaser', status: 0x99, control: 0x05, unit: 2}
    ];
    this.activeEffect = null;

    this.effectButtons = {};
    this.effects.forEach(function(effect) {
        self.effectButtons[effect.name] = new components.Button({
            midi: [effect.status, effect.control],
            group: '[EffectRack1_EffectUnit' + effect.unit + ']',
            inKey: 'enabled',
            input: function(channel, control, value, status, group) {
                if (value === 0x7F) {
                    self.toggleEffect(effect.name);
                }
            }
        });
    });

    this.setEffectUnitsForChannel = function(channel, active) {
        var unit1 = "[EffectRack1_EffectUnit1]";
        var unit2 = "[EffectRack1_EffectUnit2]";
        var groupKey = "group_[Channel" + channel + "]_enable";

        engine.setValue(unit1, groupKey, active);
        engine.setValue(unit2, groupKey, active);

        if (channel === 1 || channel === 3){
            this.switch_active_left = active;
        } else {
            this.switch_active_right = active;
        }
    };
    
    // Linker Switch (Deck 1)
    this.leftSwitch = function(channel, control, value, status, group) {
        var active = value !== 0x00;
        var inactiveDeck = this.deck1 ? 3 : 1;
        var activeDeck = this.deck1 ? 1 : 3;
        var isActive = deck => (deck === activeDeck) || !NS4FX.controller.options.OnlyActiveDeckEffect;
    
        this.setEffectUnitsForChannel(inactiveDeck, isActive(inactiveDeck) && active);
        this.setEffectUnitsForChannel(activeDeck, isActive(activeDeck) && active);
    };
    
    this.rightSwitch = function(channel, control, value, status, group) {
        var active = value !== 0x00;
        var inactiveDeck = this.deck2 ? 4 : 2;
        var activeDeck = this.deck2 ? 2 : 4;
        var isActive = deck => (deck === activeDeck) || !NS4FX.controller.options.OnlyActiveDeckEffect;
    
        this.setEffectUnitsForChannel(inactiveDeck, isActive(inactiveDeck) && active);
        this.setEffectUnitsForChannel(activeDeck, isActive(activeDeck) && active);
    };

    this.updateEffectOnDeckSwitch = function(leftSide){
        if (!NS4FX.controller.options.OnlyActiveDeckEffect){
            return;
        }

        if (leftSide) {
            var active = this.switch_active_left ? 0x01 : 0x00;
            this.leftSwitch(0, 0, active, 0, 0)
        } else {
            //var func = this.rightSwitch;
            var active = this.switch_active_right ? 0x01 : 0x00;
            this.rightSwitch(0, 0, active, 0, 0);
        }

    }
}

NS4FX.controller.EffectUnit.prototype = new components.ComponentContainer();

NS4FX.controller.Sampler = function(base) {
    for (var i = 1; i <= 4; ++i) {
        this[i] = new components.SamplerButton({
            midi: [0x9F, 0x20 + i],
            number: base+i-1,
            loaded: 0x00,
            playing: 0x7F,
        });
    }
};

NS4FX.controller.Sampler.prototype = new components.ComponentContainer();

NS4FX.controller.HeadGain = function(sampler) {
    components.Pot.call(this);

    this.ignore_next = null;
    this.shifted = false;
    this.sampler = sampler;
    this.sampler.forEachComponent(function(component) {
        engine.softTakeover(component.group, 'volume', true);
    });
};

NS4FX.controller.HeadGain.prototype = new components.Pot({
    group: '[Master]',
    inKey: 'headGain',
    input: function (channel, control, value, status, group) {
        // we call softTakeoverIgnoreNextValue() here on the non-targeted
        // control only if the control was moved when focus was switched. This
        // is to avoid a phantom triggering of soft takeover that can happen if
        // ignoreNextValue() is called un-conditionally when the control target
        // is changed (like in shift()/unshift()).
        if (this.ignore_next == "sampler" && !this.shifted) {
            this.sampler.forEachComponent(function(component) {
                engine.softTakeoverIgnoreNextValue(component.group, 'volume');
            });
            this.ignore_next = null;
        }
        else if (this.ignore_next == "headgain" && this.shifted) {
            engine.softTakeoverIgnoreNextValue(this.group, this.inKey);
            this.ignore_next = null;
        }

        if (this.shifted) {
            // make head gain control the sampler volume when shifted
            var pot = this;
            this.sampler.forEachComponent(function(component) {
                engine.setParameter(component.group, 'volume', pot.inValueScale(value));
            });
        } else {
            components.Pot.prototype.input.call(this, channel, control, value, status, group);
        }
    },
    shift: function() {
        this.shifted = true;
        this.ignore_next = "headgain";
    },
    unshift: function() {
        this.shifted = false;
        this.ignore_next = "sampler";
    },
});

/**
 * Sends the duration to the screen of the specified deck using bytecode sysex message.
 * @param {*} deck 
 * @param {*} duration 
 */
NS4FX.controller.sendScreenDurationMidi = function(deck, duration) {
    if (duration < 1) {
        duration = 1;
    }
    var durationArray = NS4FX.controller.encodeNumToArray(duration - 1);

    var bytePrefix = [0xF0, 0x00, 0x20, 0x7F, deck, 0x03];
    var bytePostfix = [0xF7];
    var byteArray = bytePrefix.concat(durationArray, bytePostfix);
    midi.sendSysexMsg(byteArray, byteArray.length);
};

/**
 * Sends the time to the screen of the specified deck using bytecode sysex message.
 * @param {*} deck 
 * @param {*} time 
 */
NS4FX.controller.sendScreenTimeMidi = function(deck, time) {
    var timeArray = NS4FX.controller.encodeNumToArray(time);

    var bytePrefix = [0xF0, 0x00, 0x20, 0x7F, deck, 0x04];
    var bytePostfix = [0xF7];
    var byteArray = bytePrefix.concat(timeArray, bytePostfix);
    midi.sendSysexMsg(byteArray, byteArray.length);
};

/**
 * Sends the BPM to the screen of the specified deck using bytecode sysex message.
 * @param {*} deck 
 * @param {*} bpm 
 */
NS4FX.controller.sendScreenBpmMidi = function(deck, bpm) {
    var bpmArray = NS4FX.controller.encodeNumToArray(bpm);
    bpmArray.shift();
    bpmArray.shift();

    var bytePrefix = [0xF0, 0x00, 0x20, 0x7F, deck, 0x01];
    var bytePostfix = [0xF7];
    var byteArray = bytePrefix.concat(bpmArray, bytePostfix);
    midi.sendSysexMsg(byteArray, byteArray.length);
};

NS4FX.controller.elapsedToggle = function () {

    var currentSetting = engine.getValue('[Controls]', 'ShowDurationRemaining');
    if (currentSetting === 0) {
        // currently showing elapsed, set to remaining
        engine.setValue('[Controls]', 'ShowDurationRemaining', 1);
    } else if (currentSetting === 1) {
        // currently showing remaining, set to elapsed
        engine.setValue('[Controls]', 'ShowDurationRemaining', 0);
    } else {
        // currently showing both (that means we are showing remaining, set to elapsed
        engine.setValue('[Controls]', 'ShowDurationRemaining', 0);
    }
};

NS4FX.controller.timeElapsedCallback = function(value, group, control) {
    // 0 = elapsed
    // 1 = remaining
    // 2 = both (we ignore this as the controller can't show both)
    var on_off;
    if (value === 0) {
        // show elapsed
        on_off = 0x00;
    } else if (value === 1) {
        // show remaining
        on_off = 0x7F;
    } else {
        // both, ignore the event
        return;
    }

    // update all 4 decks on the controller
    midi.sendShortMsg(0x90, 0x46, on_off);
    midi.sendShortMsg(0x91, 0x46, on_off);
    midi.sendShortMsg(0x92, 0x46, on_off);
    midi.sendShortMsg(0x93, 0x46, on_off);
};

NS4FX.controller.timeMs = function(deck, position, duration) {
    return Math.round(duration * position * 1000);
};

NS4FX.controller.stopScratchTimer = function (deck) {
    if (NS4FX.controller.component.option.scratchTimer[deck]) {
        engine.stopTimer(NS4FX.controller.component.option.scratchTimer[deck]);
    }
    NS4FX.controller.component.option.scratchTimer[deck] = null;
};

NS4FX.controller.resetScratchTimer = function (deck, tick) {
    if (!NS4FX.controller.component.option.scratchTimer[deck]) return;
    NS4FX.controller.component.option.scratchTick[deck] = tick;
};

NS4FX.controller.startScratchTimer = function (deck) {
    if (NS4FX.controller.component.option.scratchTimer[deck]) return;

    NS4FX.controller.component.option.scratchTick[deck] = 0;
    NS4FX.controller.component.option.scratchTimer[deck] = engine.beginTimer(20, () => {
        NS4FX.controller.scratchTimerCallback(deck);
    });
};

NS4FX.controller.scratchDisable = function (deck) {
    NS4FX.controller.component.option.deckSearching[deck] = false;
    NS4FX.controller.stopScratchTimer(deck);
    engine.scratchDisable(deck, false);
};

/**
 * Enable scratch on specified deck
 * @param {*} deck 
 */
NS4FX.controller.scratchEnable = function (deck) {
    var alpha = 1.0/8;
    var beta = alpha/32;

    engine.scratchEnable(deck, 1240, 33+1/3, alpha, beta);
    NS4FX.controller.stopScratchTimer(deck);
};

NS4FX.controller.scratchTimerCallback = function (deck) {
    // here we see if the platter is still physically moving even though the
    // platter is not being touched. For forward motion, we stop scratching
    // before the platter has physically stopped  and delay a little longer
    // when moving back. This is to mimic actual vinyl better.
    if ((NS4FX.controller.component.option.scratchDirection[deck] // forward
            && Math.abs(NS4FX.controller.component.option.scratchTick[deck]) > 2)
        || (!NS4FX.controller.component.option.scratchDirection[deck] // backward
            && Math.abs(NS4FX.controller.component.option.scratchTick[deck]) > 1))
    {
        // reset tick detection
        NS4FX.controller.component.option.scratchTick[deck] = 0;
        return;
    }

    NS4FX.controller.scratchDisable(deck);
};

NS4FX.controller.wheelTouch = function (channel, control, value, status, group) {
    var deck = channel+1;

    // ignore touch events if not in vinyl mode
    if (!NS4FX.controller.component.option.shift
        && !NS4FX.controller.component.option.deckSearching[deck]
        && !NS4FX.controller.component.option.wheel[channel]
        && value != 0)
    {
        return;
    }

    NS4FX.controller.component.option.deckTouching[deck] = 0x7F == value;


    // don't start scratching if shift is pressed
    if (value === 0x7F
        && !NS4FX.controller.component.option.shift
        && !NS4FX.controller.component.option.deckSearching[deck])
    {
        NS4FX.controller.scratchEnable(deck);
    }
    else if (value === 0x7F
             && (NS4FX.controller.component.option.shift
                || NS4FX.controller.component.option.deckSearching[deck]))
    {
        NS4FX.controller.scratchDisable(deck);
        NS4FX.controller.component.option.deckSearching[deck] = true;
        NS4FX.controller.stopScratchTimer(deck);
    }
    else {    // If button up
        NS4FX.controller.startScratchTimer(deck);
    }
}

NS4FX.controller.wheelTurn = function (channel, control, value, status, group) {
    var deck = channel+1;
    var direction;
    var newValue;
    if (value < 64) {
        direction = true;
    } else {
        direction = false;
    }

    // if the platter is spun fast enough, value will wrap past the 64 midpoint
    // but the platter will be spinning in the opposite direction we expect it
    // to be
    var delta = Math.abs(NS4FX.controller.component.option.lastScratchTick[deck] - value);
    if (NS4FX.controller.component.option.scratchDirection[deck] !== null && NS4FX.controller.component.option.scratchDirection[deck] != direction && delta < 64) {
        direction = !direction;
    }

    if (direction) {
        newValue = value;
    } else {
        newValue = value - 128;
    }

    // detect searching the track
    if (NS4FX.controller.component.option.deckSearching[deck]) {
        var position = engine.getValue(group, 'playposition');
        if (position <= 0) position = 0;
        if (position >= 1) position = 1;
        engine.setValue(group, 'playposition', position + newValue * 0.0001);
        NS4FX.controller.resetScratchTimer(deck, newValue);
        return;
    }

    // stop scratching if the wheel direction changes and the platter is not
    // being touched
    if (NS4FX.controller.component.option.scratchDirection[deck] === null) {
        NS4FX.controller.component.option.scratchDirection[deck] = direction;
    }
    else if (NS4FX.controller.component.option.scratchDirection[deck] != direction) {
        if (!NS4FX.controller.component.option.deckTouching[deck]) {
            NS4FX.controller.scratchDisable(deck);
        }
        NS4FX.controller.component.option.scratchAccumulator[deck] = 0;
    }

    NS4FX.controller.component.option.lastScratchTick[deck] = value;
    NS4FX.controller.component.option.scratchDirection[deck] = direction;
    NS4FX.controller.component.option.scratchAccumulator[deck] += Math.abs(newValue);

    // handle scratching
    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, newValue); // Scratch!
        NS4FX.controller.resetScratchTimer(deck, newValue);
    }
    // handle beat jumping
    else if (NS4FX.controller.component.option.shift) {
        if (NS4FX.controller.component.option.scratchAccumulator[deck] > 61) {
            NS4FX.controller.component.option.scratchAccumulator[deck] -= 61;
            if (direction) { // forward
                engine.setParameter(group, 'beatjump_1_forward', 1);
            } else {
                engine.setParameter(group, 'beatjump_1_backward', 1);
            }
        }
    }
    // handle pitch bending
    else {
        engine.setValue(group, 'jog', newValue * 0.1); // Pitch bend
    }
};

NS4FX.controller.wheelToggle = function (channel, control, value, status, group) {
    if (value != 0x7F) return;
    if (this.component.option.shift){
        NS4FX.controller.elapsedToggle();
    }else{
        NS4FX.controller.component.option.wheel[channel] = !NS4FX.controller.component.option.wheel[channel];
        var on_off = 0x01;
        if (NS4FX.controller.component.option.wheel[channel]) on_off = 0x7F;
        midi.sendShortMsg(0x90 | channel, 0x07, on_off);
    }
};

NS4FX.controller.deckSwitch = function (channel, control, value, status, group) {
    this.component.option.ignoreDeckSwitch = !this.component.option.ignoreDeckSwitch;

    if (!this.component.option.ignoreDeckSwitch){
        return;
    }

    var deck = channel-1;
    NS4FX.controller.component.decks[deck].setActive(value == 0x7F);

    // change effects racks
    if (NS4FX.controller.component.decks[deck].active && (channel == 0x00 || channel == 0x02)) {
        NS4FX.controller.component.effectUnit.deck1 = (deck == 1);
        var left_side = true;
    }
    else if (NS4FX.controller.component.decks[deck].active && (channel == 0x01 || channel == 0x03)) {
        NS4FX.controller.component.effectUnit.deck2 = (deck == 2);
        var left_side = false;
    }
    NS4FX.controller.component.effectUnit.updateEffectOnDeckSwitch(left_side);

    // also zero vu meters if vu displays individual decks
    if (value == 0x7F && !NS4FX.controller.options.displayVUFromBothDecks){
        NS4FX.led.zeroUVmeters();
    }
};

/**
 * Show elapsed/remaining time or both
 */
NS4FX.controller.elapsedToggle = function () {

    var currentSetting = engine.getValue('[Controls]', 'ShowDurationRemaining');
    if (currentSetting === 0) {
        // currently showing elapsed, set to remaining
        engine.setValue('[Controls]', 'ShowDurationRemaining', 1);
    } else if (currentSetting === 1) {
        // currently showing remaining, set to elapsed
        engine.setValue('[Controls]', 'ShowDurationRemaining', 0);
    } else {
        // currently showing both (that means we are showing remaining, set to elapsed
        engine.setValue('[Controls]', 'ShowDurationRemaining', 0);
    }
};

/**
 * Here be magic.
 * @param {*} number 
 * @returns number[]
 */
NS4FX.controller.encodeNumToArray = function(number) {
    var number_array = [
        (number >> 28) & 0x0F,
        (number >> 24) & 0x0F,
        (number >> 20) & 0x0F,
        (number >> 16) & 0x0F,
        (number >> 12) & 0x0F,
        (number >> 8) & 0x0F,
        (number >> 4) & 0x0F,
        number & 0x0F,
    ];

    if (number < 0) number_array[0] = 0x07;
    else number_array[0] = 0x08;

    return number_array;
};

NS4FX.controller.shiftToggle = function (channel, control, value, status, group) {
    if (control === 0x20) {
        NS4FX.controller.component.option.shift = value == 0x7F;
    }

    if (NS4FX.controller.component.option.shift) {
        NS4FX.controller.component.decks.shift();
        NS4FX.controller.component.samplerAll.shift();
        NS4FX.controller.component.browse.shift();
        NS4FX.controller.component.headGain.shift();
    }
};

// zero vu meters when toggling pfl
NS4FX.controller.pflToggle = function(value, group, control) {
    NS4FX.led.zeroUVmeters();
};

NS4FX.controller.vuCallback = function(value, group, control) {
    // the top LED lights up at 81
    var level =value * 81;
    if (engine.getValue(group, "peak_indicator")) {
        level = 81;
    }
    if (NS4FX.controller.options.displayVUFromBothDecks){
        if (group == '[Main]' && control == 'vu_meter_left') {
            if (engine.getValue(group, "peak_indicator_left")) {
                level = 81;
            }
            midi.sendShortMsg(0xB0, 0x1F, level);
            midi.sendShortMsg(0xB2, 0x1F, level);
           }
           else if (group == '[Main]' && control == 'vu_meter_right') {
               if (engine.getValue(group, "peak_indicator_right")) {
                   level = 81;
                   midi.sendShortMsg(0xB1, 0x1F, level);
                   midi.sendShortMsg(0xB3, 0x1F, level);
               }
            
        }
    }else{
        if (group == '[Channel1]' && NS4FX.controller.component.decks[1].active) {
            midi.sendShortMsg(0xB0, 0x1F, level);
        }
        else if (group == '[Channel3]' && NS4FX.controller.component.decks[2].active) {
            midi.sendShortMsg(0xB2, 0x1F, level);
        }
        else if (group == '[Channel2]' && NS4FX.controller.component.decks[3].active) {
            midi.sendShortMsg(0xB1, 0x1F, level);
        }
        else if (group == '[Channel4]' && NS4FX.controller.component.decks[4].active) {
            midi.sendShortMsg(0xB3, 0x1F, level);
        }
    }

 };

NS4FX.controller.debugMsg = function(message) {

}






//////////////////////////////////////////////////////////////////////
// LED Control
//////////////////////////////////////////////////////////////////////

NS4FX.led.constants = {
    OFF: 0x00,
    UV_METER_1: 0xB0,
    UV_METER_2: 0xB1,
    UV_METER_3: 0xB2,
    UV_METER_4: 0xB3,
};

NS4FX.led.init = function() {

    NS4FX.led.zeroUVmeters();
    // init a bunch of channel specific leds

    for (var i = 0; i < 4; ++i) {
        var group = "[Channel"+(i+1)+"]";

        // keylock indicator
        NS4FX.led.msg(group, 'keylock', i, 0x0D);

        // turn off bpm arrows
        midi.sendShortMsg(0x80 | i, 0x0A, 0x00); // down arrow off
        midi.sendShortMsg(0x80 | i, 0x09, 0x00); // up arrow off

        // slip indicator
        NS4FX.led.msg(group, 'slip_enabled', i, 0x0F);

        // initialize wheel mode (and leds)
        NS4FX.controller.component.option.wheel[i] = NS4FX.controller.options.enableWheel;
        midi.sendShortMsg(0x90 | i, 0x07, NS4FX.controller.options.enableWheel ? 0x7F : 0x01);
    };

    // setup elapsed/remaining tracking
    engine.makeConnection("[Controls]", "ShowDurationRemaining", NS4FX.controller.timeElapsedCallback);

    // setup vumeter tracking
    engine.makeUnbufferedConnection("[Channel1]", "vu_meter", NS4FX.controller.vuCallback);
    engine.makeUnbufferedConnection("[Channel2]", "vu_meter", NS4FX.controller.vuCallback);
    engine.makeUnbufferedConnection("[Channel3]", "vu_meter", NS4FX.controller.vuCallback);
    engine.makeUnbufferedConnection("[Channel4]", "vu_meter", NS4FX.controller.vuCallback);
    engine.makeUnbufferedConnection("[Main]", "vu_meter_left", NS4FX.controller.vuCallback);
    engine.makeUnbufferedConnection("[Main]", "vu_meter_right", NS4FX.controller.vuCallback);
};

NS4FX.led.shutdown = function() {
    // turn off a bunch of channel specific leds
    for (var i = 0; i < 4; ++i) {
        // pfl/cue button leds
        midi.sendShortMsg(0x90 | i, 0x1B, 0x01);

        // loop leds
        midi.sendShortMsg(0x80 | i + 5, 0x32, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x33, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x34, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x35, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x38, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x39, 0x00);

        // play leds
        midi.sendShortMsg(0x90 | i, 0x00, 0x01);
        midi.sendShortMsg(0x90 | i, 0x04, 0x01);

        // sync leds
        midi.sendShortMsg(0x90 | i, 0x00, 0x02);
        midi.sendShortMsg(0x90 | i, 0x04, 0x03);

        // cue leds
        midi.sendShortMsg(0x90 | i, 0x00, 0x01);
        midi.sendShortMsg(0x90 | i, 0x04, 0x05);

        // hotcue leds
        midi.sendShortMsg(0x80 | i + 5, 0x18, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x19, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1A, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1B, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x20, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x21, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x22, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x23, 0x00);

        // auto-loop leds
        midi.sendShortMsg(0x80 | i + 5, 0x14, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x15, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x16, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x17, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1C, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1D, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1E, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1F, 0x00);

        // update spinner and position indicator
        midi.sendShortMsg(0xB0 | i, 0x3F, 0);
        midi.sendShortMsg(0xB0 | i, 0x06, 0);

        // keylock indicator
        midi.sendShortMsg(0x80 | i, 0x0D, 0x00);

        // turn off bpm arrows
        midi.sendShortMsg(0x80 | i, 0x0A, 0x00); // down arrow off
        midi.sendShortMsg(0x80 | i, 0x09, 0x00); // up arrow off

        // turn off slip indicator
        midi.sendShortMsg(0x80 | i, 0x0F, 0x00);

        // turn off wheel button leds
        midi.sendShortMsg(0x80 | i, 0x07, 0x00);
    }

    // dim FX leds
    midi.sendShortMsg(0x98, 0x00, 0x01);
    midi.sendShortMsg(0x98, 0x01, 0x01);
    midi.sendShortMsg(0x98, 0x02, 0x01);
    midi.sendShortMsg(0x99, 0x00, 0x01);
    midi.sendShortMsg(0x99, 0x01, 0x01);
    midi.sendShortMsg(0x99, 0x02, 0x01);

    // turn off sampler leds
    midi.sendShortMsg(0x8F, 0x21, 0x00);
    midi.sendShortMsg(0x8F, 0x22, 0x00);
    midi.sendShortMsg(0x8F, 0x23, 0x00);
    midi.sendShortMsg(0x8F, 0x24, 0x00);

    NS4FX.led.zeroUVmeters();
};

NS4FX.led.msg = function(group, key, channel, midino){
    if (engine.getValue(group, key)) {
        midi.sendShortMsg(0x90 | channel, midino, 0x7F);
    }
    else {
        midi.sendShortMsg(0x80 | channel, midino, 0x00);
    }
};

NS4FX.led.zeroUVmeters = function() {
    midi.sendShortMsg(NS4FX.led.constants.UV_METER_1, 0x1f, NS4FX.led.constants.OFF);
    midi.sendShortMsg(NS4FX.led.constants.UV_METER_2, 0x1f, NS4FX.led.constants.OFF);
    midi.sendShortMsg(NS4FX.led.constants.UV_METER_3, 0x1f, NS4FX.led.constants.OFF);
    midi.sendShortMsg(NS4FX.led.constants.UV_METER_4, 0x1f, NS4FX.led.constants.OFF);
};