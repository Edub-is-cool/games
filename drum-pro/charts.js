/* Drum Pro — note charts.
 *
 * Each pattern is one or two bars of 16th notes, written as a string per lane so
 * the groove is readable as text. 'x' is a hit; in the hi-hat lane 'o' is an open
 * hat. The pattern loops for the length of the run over a metronome click.
 */
const Charts = (() => {
  const CHARTS = [
    {
      id: 'rock',
      name: 'Straight Rock',
      desc: 'Eighths on the hat, backbeat on 2 and 4.',
      bpm: 96, steps: 16, loops: 8,
      lanes: {
        hihat: 'x-x-x-x-x-x-x-x-',
        snare: '----x-------x---',
        kick:  'x-------x-------',
      },
    },
    {
      id: 'backbeat',
      name: 'Backbeat Plus',
      desc: 'Busier kick, open hat on the last eighth.',
      bpm: 104, steps: 16, loops: 8,
      lanes: {
        hihat: 'x-x-x-x-x-x-x-o-',
        snare: '----x-------x---',
        kick:  'x-----x-x-------',
      },
    },
    {
      id: 'funk',
      name: 'Funk Sixteen',
      desc: 'Sixteenth hats and syncopated ghost snares.',
      bpm: 92, steps: 16, loops: 8,
      lanes: {
        hihat: 'x-xxx-xxx-xxx-xx',
        snare: '----x--x----x-x-',
        kick:  'x--x----x-x-----',
      },
    },
    {
      id: 'fill',
      name: 'Tom Fill',
      desc: 'Two bars: groove, then a descending fill around the kit.',
      bpm: 108, steps: 32, loops: 6,
      lanes: {
        crash:    'x-------------------------------',
        hihat:    '--x-x-x-x-x-x-x---x-x-x-x-------',
        snare:    '----x-------x-------x-------x---',
        kick:     'x-------x-------x-------x-------',
        highTom:  '------------------------x-x-----',
        midTom:   '----------------------------x---',
        floorTom: '------------------------------x-',
      },
    },
    {
      id: 'double',
      name: 'Double Time',
      desc: 'Ride pattern at speed. Snare on every other beat.',
      bpm: 150, steps: 16, loops: 10,
      lanes: {
        ride:  'x-x-x-x-x-x-x-x-',
        snare: '--x---x---x---x-',
        kick:  'x---x---x---x---',
      },
    },
  ];

  function secPerStep(chart) {
    return 60 / chart.bpm / 4;   // one 16th note
  }

  // Flattens the looping pattern into an absolute note list, offset from startTime.
  function build(chart, startTime) {
    const sps = secPerStep(chart);
    const notes = [];
    for (let loop = 0; loop < chart.loops; loop++) {
      const base = loop * chart.steps;
      for (const laneId in chart.lanes) {
        const row = chart.lanes[laneId];
        for (let s = 0; s < chart.steps; s++) {
          const c = row[s];
          if (c !== 'x' && c !== 'o') continue;
          notes.push({
            lane: laneId,
            // 'o' only means anything on the hat; elsewhere treat it as a normal hit.
            pieceId: (laneId === 'hihat' && c === 'o') ? 'hihatOpen' : laneId,
            open: laneId === 'hihat' && c === 'o',
            time: startTime + (base + s) * sps,
            judged: false,
            result: null,
          });
        }
      }
    }
    notes.sort((a, b) => a.time - b.time);
    return notes;
  }

  function totalSteps(chart) { return chart.steps * chart.loops; }
  function duration(chart) { return totalSteps(chart) * secPerStep(chart); }
  function noteCount(chart) {
    let n = 0;
    for (const laneId in chart.lanes) {
      for (const c of chart.lanes[laneId]) if (c === 'x' || c === 'o') n++;
    }
    return n * chart.loops;
  }

  return { CHARTS, build, secPerStep, totalSteps, duration, noteCount };
})();
