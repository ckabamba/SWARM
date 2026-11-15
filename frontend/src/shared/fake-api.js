/*
 * WarmPath prototype data. Everything here is invented: no real people, and the
 * events are placeholders, not real listings.
 *
 * The functions mirror the endpoints in docs/mvp.md and return the same JSON
 * shapes, so a prototype screen can later be pointed at the real API.
 *
 * One field is NOT in the contract yet: stops carry `typical_year`, which the
 * maps use to place a stop left to right. It is flagged where it is set.
 *
 * Copied from prototypes/shared/fake-api.js as an ES module. Development fixture only.
 */

  var GOAL = { id: 12, label: 'SWE internship at NVIDIA', achievers: 14 }
  var ALUMNI_TOTAL = 300
  var ASKS_KEY = 'warmpath.prototype.asks'

  var STUDENTS = [
    { id: 1, name: 'Maya Chen', major: 'CompE', school_year: 2 },
    { id: 2, name: 'Devon Brooks', major: 'CS', school_year: 1 },
  ]
  // What each student already has. Not part of GET /students; the server keeps it.
  var HAVE = { 1: [3, 5], 2: [5] }

  var TYPE_LABEL = {
    vip: 'VIP team',
    club: 'Club',
    course: 'Course',
    lab: 'Research lab',
    internship: 'Internship',
    job: 'Job',
  }

  // Sorted by lift, as POST /path returns them.
  var STOPS = [
    {
      activity_id: 3,
      name: 'VIP: Embedded Vision',
      type: 'vip',
      achievers: 9,
      lift: 4.1,
      typical_year: 2, // PROPOSED field, not in the contract
      event: {
        id: 40,
        title: 'Info session',
        starts_at: '2026-11-17T18:00:00-05:00',
        location: 'Klaus 1116',
        link: 'https://example.com/event/40',
      },
    },
    {
      activity_id: 4,
      name: 'VIP: GPU Systems',
      type: 'vip',
      achievers: 7,
      lift: 3.6,
      typical_year: 3,
      event: {
        id: 41,
        title: 'Team demo night',
        starts_at: '2026-11-19T17:30:00-05:00',
        location: 'Van Leer C240',
        link: 'https://example.com/event/41',
      },
    },
    {
      activity_id: 7,
      name: 'CS 3210 Operating Systems',
      type: 'course',
      achievers: 8,
      lift: 2.9,
      typical_year: 3,
      event: null,
    },
    {
      activity_id: 5,
      name: 'RoboJackets',
      type: 'club',
      achievers: 6,
      lift: 2.4,
      typical_year: 1,
      event: {
        id: 42,
        title: 'Software training night',
        starts_at: '2026-11-16T19:00:00-05:00',
        location: 'Student Competition Center',
        link: 'https://example.com/event/42',
      },
    },
    {
      activity_id: 9,
      name: 'Computer Architecture Lab',
      type: 'lab',
      achievers: 5,
      lift: 2.2,
      typical_year: 3,
      event: {
        id: 43,
        title: 'Undergraduate research open house',
        starts_at: '2026-11-20T15:00:00-05:00',
        location: 'Klaus 2443',
        link: 'https://example.com/event/43',
      },
    },
  ]

  // Eight named achievers. The other six of the 14 stay unnamed in the prototype.
  var ALUMNI = [
    // did: activity id -> the school year they did it in
    { id: 87, name: 'Priya Raman', major: 'CompE', grad_year: 2023, did: { 3: 2, 4: 3, 7: 3 } },
    { id: 64, name: 'Marcus Oyelaran', major: 'CompE', grad_year: 2022, did: { 3: 2, 5: 2, 9: 3 } },
    { id: 140, name: 'Aisha Bello', major: 'CompE', grad_year: 2024, did: { 3: 2, 4: 3 } },
    { id: 112, name: 'Hannah Lindqvist', major: 'CS', grad_year: 2024, did: { 3: 2, 7: 3 } },
    { id: 95, name: 'Sofia Marin', major: 'CS', grad_year: 2023, did: { 5: 1, 3: 2, 4: 3 } },
    { id: 131, name: 'Jordan Kim', major: 'CS', grad_year: 2024, did: { 5: 1, 4: 3, 7: 3 } },
    { id: 77, name: 'Wei-Lin Tao', major: 'CS', grad_year: 2022, did: { 5: 1, 7: 3, 9: 3 } },
    { id: 58, name: 'Tobias Engel', major: 'EE', grad_year: 2021, did: { 3: 2, 7: 3, 9: 3 } },
  ]

  var ORDINAL = ['', 'first', 'second', 'third', 'fourth']

  function clone(value) {
    return JSON.parse(JSON.stringify(value))
  }
  function studentById(id) {
    return STUDENTS.filter(function (s) { return s.id === Number(id) })[0] || STUDENTS[0]
  }
  function stopById(id) {
    return STOPS.filter(function (s) { return s.activity_id === Number(id) })[0]
  }
  function nextStopFor(studentId) {
    var have = HAVE[studentId] || []
    return STOPS.filter(function (s) { return have.indexOf(s.activity_id) === -1 })[0] || null
  }

  // ---- People ranking: shared activities weigh most, then major, then year ----
  function rank(student, alum) {
    var have = HAVE[student.id] || []
    var next = nextStopFor(student.id)
    var shared = have.filter(function (id) { return alum.did[id] })
    var sameMajor = alum.major === student.major
    // A shared activity the alum did in the year the student is in now.
    var inStep = shared.filter(function (id) { return alum.did[id] === student.school_year })[0]
    var didNext = next && alum.did[next.activity_id]

    var score = 0.2 + (shared.length ? 0.24 : 0) + (shared.length > 1 ? 0.1 : 0) +
      (sameMajor ? 0.2 : 0) + (inStep ? 0.1 : 0) + (didNext ? 0.08 : 0)
    score = Math.round(score * 100) / 100

    var first = alum.name.split(' ')[0]
    var lead = sameMajor ? 'You are both ' + student.major + ' and both ' : 'You both '
    var tie
    if (shared.length > 1) {
      tie = lead + 'did ' + shared.map(function (id) { return stopById(id).name }).join(' and ')
    } else if (shared.length) {
      var stop = stopById(shared[0])
      tie = lead + 'joined ' + stop.name + (inStep ? ' in ' + ORDINAL[alum.did[stop.activity_id]] + ' year' : '')
    } else if (didNext) {
      tie = (sameMajor ? 'You are both ' + student.major + ', and ' : '') + first + ' went through ' + next.name + ', your next stop'
    } else {
      tie = sameMajor ? 'You are both ' + student.major : first + ' reached the same goal from a different start'
    }
    return { score: score, tie: tie }
  }

  // The offline fallback from docs/mvp.md: fill a template with the shared tie.
  function draftFor(student, alum, tie) {
    var first = alum.name.split(' ')[0]
    var next = nextStopFor(student.id)
    var line = tie.replace(/^You are both/, 'We are both').replace(/^You both/, 'We both').replace(', your next stop', ', which looks like my next stop')
    return (
      'Hi ' + first + ', I am a ' + ORDINAL[student.school_year] + '-year ' + student.major +
      ' student at Georgia Tech. ' + line + '. I am working toward a ' + GOAL.label +
      (next ? ' and deciding whether ' + next.name + ' should come next' : '') +
      '. Would you have 15 minutes for a call about how you approached it?'
    )
  }

  // ---- Asks live in localStorage so a second tab can play the alum ----
  function readAsks() {
    try {
      return JSON.parse(localStorage.getItem(ASKS_KEY) || '{}')
    } catch (error) {
      return {}
    }
  }
  function writeAsks(asks) {
    try {
      localStorage.setItem(ASKS_KEY, JSON.stringify(asks))
    } catch (error) {
      /* private mode: the ask still works inside this tab */
    }
    memoryAsks = asks
    listeners.forEach(function (fn) { fn() })
  }
  var memoryAsks = readAsks()
  var listeners = []
  window.addEventListener('storage', function (event) {
    if (event.key !== ASKS_KEY) return
    memoryAsks = readAsks()
    listeners.forEach(function (fn) { fn() })
  })

  function fullAsk(row) {
    var student = studentById(row.student_id)
    var alum = ALUMNI.filter(function (a) { return a.id === row.alum_id })[0] || ALUMNI[0]
    return {
      id: row.id,
      status: row.status,
      student: clone(student),
      alum: { id: alum.id, name: alum.name, major: alum.major, grad_year: alum.grad_year },
      shared_tie: rank(student, alum).tie,
      message: row.message,
    }
  }

  var api = {
    TYPE_LABEL: TYPE_LABEL,
    ALUMNI_TOTAL: ALUMNI_TOTAL,
    SEEDED_GOALS: ['SWE internship at NVIDIA', 'get into robotics research', 'launch a startup', 'grad school for machine learning'],

    /** GET /students */
    getStudents: function () {
      return clone(STUDENTS)
    },

    /** POST /path  { goal, student_id }. Every goal resolves to the one seeded path. */
    postPath: function (body) {
      var student = studentById(body.student_id)
      var have = HAVE[student.id] || []
      var next = nextStopFor(student.id)
      var stops = STOPS.map(function (s) {
        var stop = clone(s)
        stop.have = have.indexOf(s.activity_id) !== -1
        stop.next = !!next && next.activity_id === s.activity_id
        return stop
      })
      var events = stops
        .filter(function (s) { return s.event })
        .map(function (s) {
          var event = clone(s.event)
          event.activity_id = s.activity_id
          return event
        })
        .sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1 })
      return { goal: clone(GOAL), student: clone(student), stops: stops, events: events }
    },

    /** GET /people?goal_id&student_id&activity_id  (leave out activity_id for the goal itself) */
    getPeople: function (query) {
      var student = studentById(query.student_id)
      return ALUMNI
        .filter(function (a) { return !query.activity_id || a.did[query.activity_id] })
        .map(function (a) {
          var r = rank(student, a)
          return {
            id: a.id,
            name: a.name,
            major: a.major,
            grad_year: a.grad_year,
            shared_tie: r.tie,
            score: r.score,
            draft: draftFor(student, a, r.tie),
          }
        })
        .sort(function (a, b) { return b.score - a.score })
    },

    /** POST /asks */
    postAsk: function (body) {
      var asks = readAsks()
      var id = Object.keys(asks).reduce(function (max, key) { return Math.max(max, Number(key)) }, 4) + 1
      asks[id] = {
        id: id,
        student_id: body.student_id,
        alum_id: body.alum_id,
        goal_id: body.goal_id,
        message: body.message,
        status: 'sent',
        created_at: new Date().toISOString(),
      }
      writeAsks(asks)
      return { id: id, status: 'sent', reply_url: '#/reply/' + id }
    },

    /** GET /asks/{id}. Unknown ids fall back to a seeded ask so the reply page opens on its own. */
    getAsk: function (id) {
      var row = memoryAsks[id]
      if (!row) {
        var student = STUDENTS[0]
        var alum = ALUMNI[0]
        row = {
          id: Number(id) || 5,
          student_id: student.id,
          alum_id: alum.id,
          goal_id: GOAL.id,
          message: draftFor(student, alum, rank(student, alum).tie),
          status: 'sent',
        }
      }
      return fullAsk(row)
    },

    /** POST /asks/{id}/accept */
    acceptAsk: function (id) {
      var asks = readAsks()
      var seeded = api.getAsk(id)
      asks[id] = asks[id] || {
        id: seeded.id,
        student_id: seeded.student.id,
        alum_id: seeded.alum.id,
        goal_id: GOAL.id,
        message: seeded.message,
      }
      asks[id].status = 'accepted'
      writeAsks(asks)
      return fullAsk(asks[id])
    },

    /** Not an endpoint: the status of every ask this student has sent, keyed by alum id. */
    asksByAlum: function (studentId) {
      var out = {}
      Object.keys(memoryAsks).forEach(function (key) {
        var row = memoryAsks[key]
        if (row.student_id === Number(studentId)) out[row.alum_id] = { id: row.id, status: row.status }
      })
      return out
    },

    /** Not an endpoint: stands in for polling GET /asks/{id}. Returns an unsubscribe function. */
    subscribe: function (fn) {
      listeners.push(fn)
      return function () {
        listeners = listeners.filter(function (l) { return l !== fn })
      }
    },

    /** Not an endpoint: clears sent asks so the demo can be run again. */
    reset: function () {
      writeAsks({})
    },

    // ---- Small formatting helpers shared by the prototypes ----
    ordinal: function (n) {
      return ORDINAL[n] || String(n)
    },
    eventDay: function (iso) {
      var d = new Date(iso)
      return {
        weekday: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' }),
        weekdayLong: d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' }),
        day: d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'America/New_York' }),
        month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/New_York' }),
        time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }),
      }
    },
    /** Share of all alumni who did a stop, worked back from lift. */
    baseRate: function (stop) {
      var share = stop.achievers / GOAL.achievers / stop.lift
      return { share: share, count: Math.round(share * ALUMNI_TOTAL), total: ALUMNI_TOTAL }
    },
  }

export default api
