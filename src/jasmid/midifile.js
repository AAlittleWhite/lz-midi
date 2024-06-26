/**
 * class to parse the .mid file format
 * (depends on _stream.js)
 */

import Stream from './_stream'

export function MidiFile (data) {
  console.log('MidiFile 输入数据', data)
  var lastEventTypeByte

  function readChunk (stream) {
    var id = stream.read(4)
    var length = stream.readInt32()
    return {
      'id': id,
      'length': length,
      'data': stream.read(length)
    }
  }

  function readEvent (stream) {
    var event = {}
    // delateTime 通常表示时间增量或者时间差
    event.deltaTime = stream.readVarInt()
    var eventTypeByte = stream.readInt8()
    if ((eventTypeByte & 0xf0) === 0xf0) {
      /* system / meta event */
      if (eventTypeByte === 0xff) {
        /* meta event */
        event.type = 'meta'
        var subtypeByte = stream.readInt8()
        let length = stream.readVarInt()
        switch (subtypeByte) {
          case 0x00:
            event.subtype = 'sequenceNumber'
            if (length !== 2) throw new Error('Expected length for sequenceNumber event is 2, got ' + length)
            event.number = stream.readInt16()
            return event
          case 0x01:
            event.subtype = 'text'
            event.text = stream.read(length)
            return event
          case 0x02:
            event.subtype = 'copyrightNotice'
            event.text = stream.read(length)
            return event
          case 0x03:
            event.subtype = 'trackName'
            event.text = stream.read(length)
            return event
          case 0x04:
            event.subtype = 'instrumentName'
            event.text = stream.read(length)
            return event
          case 0x05:
            event.subtype = 'lyrics'
            event.text = stream.read(length)
            return event
          case 0x06:
            event.subtype = 'marker'
            event.text = stream.read(length)
            return event
          case 0x07:
            event.subtype = 'cuePoint'
            event.text = stream.read(length)
            return event
          case 0x20:
            event.subtype = 'midiChannelPrefix'
            if (length !== 1) throw new Error('Expected length for midiChannelPrefix event is 1, got ' + length)
            event.channel = stream.readInt8()
            return event
          case 0x2f:
            event.subtype = 'endOfTrack'
            if (length !== 0) throw new Error('Expected length for endOfTrack event is 0, got ' + length)
            return event
          case 0x51:
            event.subtype = 'setTempo'
            if (length !== 3) throw new Error('Expected length for setTempo event is 3, got ' + length)
            event.microsecondsPerBeat = (
              (stream.readInt8() << 16) +
              (stream.readInt8() << 8) +
              stream.readInt8()
            )
            return event
          case 0x54:
            event.subtype = 'smpteOffset'
            if (length !== 5) throw new Error('Expected length for smpteOffset event is 5, got ' + length)
            var hourByte = stream.readInt8()
            event.frameRate = {
              0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30
            }[hourByte & 0x60]
            event.hour = hourByte & 0x1f
            event.min = stream.readInt8()
            event.sec = stream.readInt8()
            event.frame = stream.readInt8()
            event.subframe = stream.readInt8()
            return event
          case 0x58:
            event.subtype = 'timeSignature'
            if (length !== 4) throw new Error('Expected length for timeSignature event is 4, got ' + length)
            event.numerator = stream.readInt8()
            event.denominator = Math.pow(2, stream.readInt8())
            event.metronome = stream.readInt8()
            event.thirtyseconds = stream.readInt8()
            return event
          case 0x59:
            event.subtype = 'keySignature'
            if (length !== 2) throw new Error('Expected length for keySignature event is 2, got ' + length)
            event.key = stream.readInt8(true)
            event.scale = stream.readInt8()
            return event
          case 0x7f:
            event.subtype = 'sequencerSpecific'
            event.data = stream.read(length)
            return event
          default:
            // console.log("Unrecognised meta event subtype: " + subtypeByte)
            event.subtype = 'unknown'
            event.data = stream.read(length)
            return event
        }
        // event.data = stream.read(length)
        // return event
      } else if (eventTypeByte === 0xf0) {
        event.type = 'sysEx'
        let length = stream.readVarInt()
        event.data = stream.read(length)
        return event
      } else if (eventTypeByte === 0xf7) {
        event.type = 'dividedSysEx'
        let length = stream.readVarInt()
        event.data = stream.read(length)
        return event
      } else {
        throw new Error('Unrecognised MIDI event type byte: ' + eventTypeByte)
      }
    } else {
      /* channel event */
      var param1
      if ((eventTypeByte & 0x80) === 0) {
        /* running status - reuse lastEventTypeByte as the event type.
          eventTypeByte is actually the first parameter
        */
        param1 = eventTypeByte
        eventTypeByte = lastEventTypeByte
      } else {
        param1 = stream.readInt8()
        lastEventTypeByte = eventTypeByte
      }
      var eventType = eventTypeByte >> 4
      event.channel = eventTypeByte & 0x0f
      event.type = 'channel'
      switch (eventType) {
        case 0x08:
          event.subtype = 'noteOff'
          event.noteNumber = param1
          event.velocity = stream.readInt8()
          return event
        case 0x09:
          event.noteNumber = param1
          event.velocity = stream.readInt8()
          if (event.velocity === 0) {
            event.subtype = 'noteOff'
          } else {
            event.subtype = 'noteOn'
          }
          return event
        case 0x0a:
          event.subtype = 'noteAftertouch'
          event.noteNumber = param1
          event.amount = stream.readInt8()
          return event
        case 0x0b:
          event.subtype = 'controller'
          event.controllerType = param1
          event.value = stream.readInt8()
          return event
        case 0x0c:
          event.subtype = 'programChange'
          event.programNumber = param1
          return event
        case 0x0d:
          event.subtype = 'channelAftertouch'
          event.amount = param1
          return event
        case 0x0e:
          event.subtype = 'pitchBend'
          event.value = param1 + (stream.readInt8() << 7)
          return event
        default:
          throw new Error('Unrecognised MIDI event type: ' + eventType)
      /*
      console.log("Unrecognised MIDI event type: " + eventType)
      stream.readInt8()
      event.subtype = 'unknown'
      return event
      */
      }
    }
  }

  const stream = Stream(data)
  var headerChunk = readChunk(stream)
  console.log('headerChunk', headerChunk)
  if (headerChunk.id !== 'MThd' || headerChunk.length !== 6) {
    throw new Error('Bad .mid file - header not found')
  }
  var headerStream = Stream(headerChunk.data)
  var formatType = headerStream.readInt16() // 1
  var trackCount = headerStream.readInt16() // 2
  var timeDivision = headerStream.readInt16() // 480
  var ticksPerBeat

  // 按位与运算符 &：将两个操作数的二进制表示的每一位进行比较，如果两个操作数的对应位都为1，则结果的对应位也为1，否则为0。
  if (timeDivision & 0x8000) {
    // 目前还不支持用SMTPE帧表示时间划分
    throw new Error('Expressing time division in SMTPE frames is not supported yet')
  } else {
    ticksPerBeat = timeDivision
  }

  var header = {
    'formatType': formatType, // 1
    'trackCount': trackCount, // 2
    'ticksPerBeat': ticksPerBeat // 480
  }
  var tracks = []
  for (var i = 0; i < header.trackCount; i++) {
    tracks[i] = []
    var trackChunk = readChunk(stream)
    if (trackChunk.id !== 'MTrk') {
      throw new Error('Unexpected chunk - expected MTrk, got ' + trackChunk.id)
    }
    var trackStream = Stream(trackChunk.data)
    while (!trackStream.eof()) {
      var event = readEvent(trackStream)
      tracks[i].push(event)
    // console.log(event)
    }
  }

  return {
    'header': header,
    'tracks': tracks
  }
}
