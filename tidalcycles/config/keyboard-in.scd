(
var on, off;
var osc;

osc = NetAddr.new("127.0.0.1", 6010);

~notes=[];

MIDIClient.init;
MIDIIn.connectAll;

on = MIDIFunc.noteOn({ |val, num, chan, src|
	~notes=~notes.add(num);
	~notes=~notes.sort({|a,b| a>b}).reverse;
	osc.sendMsg("/ctrl", "notes", format("%", ~notes-60));
});

off = MIDIFunc.noteOff({ |val, num, chan, src|
	~notes=~notes.takeThese({|x| x ==num});
	osc.sendMsg("/ctrl", "notes", format("%", ~notes-60));
});


if (~stopMidiToOsc != nil, {
	~stopMidiToOsc.value;
});

~stopMidiToOsc = {
	on.free;
	off.free;
};
)

