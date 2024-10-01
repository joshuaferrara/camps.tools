/**
 * Jest doesn't like importing postal-mime for some reason.
 *
 * We'll just stub the class here.
 */

interface PostalMimeOptions {}

interface RawEmail {}

interface Email {}

export default class PostalMime {
  static parse(_email: RawEmail, _options?: PostalMimeOptions): Promise<Email> {
    return Promise.resolve({} as Email)
  }
}
