/* Wrapper for accessing strings through sequential reads */
/**
 * 用于通过顺序读取访问字符串的包装器
 * @param {string} str 需要进行顺序读取的字符串
 * @returns {Object} 返回一个包含各种读取方法的对象
 */
export default function (str) {
  var position = 0 // 当前读取位置

  /**
   * 读取指定长度的字符串
   * @param {number} length - 需要读取的长度
   * @returns {string} 返回读取到的字符串
   */
  function read (length) {
    var result = str.substr(position, length)
    position += length
    return result
  }

  /* read a big-endian 32-bit integer */
  /**
   * 从字符串中读取一个大端序32位整数
   * @returns {number} 返回读取到的整数
   */
  function readInt32 () {
    var result = (
    (str.charCodeAt(position) << 24) +
    (str.charCodeAt(position + 1) << 16) +
    (str.charCodeAt(position + 2) << 8) +
    str.charCodeAt(position + 3))
    position += 4
    return result
  }

  /* read a big-endian 16-bit integer */
   /**
   * 从字符串中读取一个大端序16位整数
   * @returns {number} 返回读取到的整数
   */
  function readInt16 () {
    var result = (
    (str.charCodeAt(position) << 8) +
    str.charCodeAt(position + 1))
    position += 2
    return result
  }

  /* read an 8-bit integer */
   /**
   * 从字符串中读取一个8位整数
   * @param {boolean} signed - 指示是否为有符号整数
   * @returns {number} 返回读取到的整数
   */
  function readInt8 (signed) {
    var result = str.charCodeAt(position)
    if (signed && result > 127) result -= 256
    position += 1
    return result
  }

  /**
   * 检查是否已经到达字符串的末尾
   * @returns {boolean} 如果已经到达末尾则返回true，否则返回false
   */
  function eof () {
    return position >= str.length
  }

  /* read a MIDI-style variable-length integer
    (big-endian value in groups of 7 bits,
    with top bit set to signify that another byte follows)
  */
    /**
   * 读取一个MIDI风格的变长整数（大端序，每7位一组，最高位为1表示还有后续字节）
   * @returns {number} 返回读取到的变长整数
   */
    function readVarInt () {
    var result = 0
    while (true) {
      var b = readInt8()
      if (b & 0x80) {
        result += (b & 0x7f)
        result <<= 7
      } else {
        /* b is the last byte */
        return result + b
      }
    }
  }

  return {
    'eof': eof,
    'read': read,
    'readInt32': readInt32,
    'readInt16': readInt16,
    'readInt8': readInt8,
    'readVarInt': readVarInt
  }
}
