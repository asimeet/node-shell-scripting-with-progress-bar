const { log: info } = console
const NO_OF_RECORDS = 55
const RECORDS_FETCH_TIME = 3
const PROCESSING_TIME_OF_ONE_RECORD = 0.2

const BAR_MESSAGE = '$percentage % | processed $currentRecord / $size records'
const [WINDOW_SIZE] = process.stdout.getWindowSize()
const BAR_SIZE = Math.abs(WINDOW_SIZE - BAR_MESSAGE.length)
const PROGRESS_BAR_REDUCTION_FACTOR = 100 / BAR_SIZE
const GREEN_BAR = '\x1b[42m \x1b[0m'
const WHITE_BAR = '\x1b[47m \x1b[0m'
let retries = 0

const stop = () => process.kill(process.pid)

const interact = async (message, choiceCbs) => {
  const choices = Object.keys(choiceCbs).join('/')
  info(`${message} ${choices}:`)

  const input = await new Promise((resolve, _reject) => {
    process.stdin.resume()
    process.stdin.on('data', data => {
      const choice = data.toString().trim().toLowerCase()
      resolve(choice)
    })
  })

  const cb = choiceCbs[input]

  if (retries > 2) {
    info('Too many retries with invalid values. Script is now terminating')
    stop()
  }

  if (!cb) {
    retries++
    info(`Invalid value, please retry with one of these values: ${choices}`)
    return interact(message, choiceCbs)
  }

  retries = 0
  return cb()
}

const getRecords = async () => {
  const results = await new Promise((resolve, _reject) => {
    setTimeout(() => {
      const records = Array.from({ length: NO_OF_RECORDS }).map((item, index) => {
        return { _id: index }
      })
      resolve(records)
    }, RECORDS_FETCH_TIME * 1000)
  })

  return results
}

const processRecord = async record => {
  await new Promise((resolve, _reject) => {
    setTimeout(() => {
      record.processed = true
      resolve()
    }, PROCESSING_TIME_OF_ONE_RECORD * 1000)
  })
}

const updateProgressBar = (currentRecord, size) => {
  const percentage = ((currentRecord * 100) / size).toFixed(1)
  const length = 100 / PROGRESS_BAR_REDUCTION_FACTOR
  const progress = percentage / PROGRESS_BAR_REDUCTION_FACTOR

  const bar = Array.from({ length })
    .map((item, index) => (index < progress ? GREEN_BAR : WHITE_BAR))
    .join('')

  const msg = BAR_MESSAGE.replace('$percentage', percentage)
    .replace('$currentRecord', currentRecord)
    .replace('$size', size)

  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(`${bar} ${msg}`)
}

const start = async () => {
  info(`Getting Records... It can take upto ${RECORDS_FETCH_TIME} seconds`)
  const records = await getRecords()
  info(`Fetched ${records.length} Records.`)

  let choiceCbs = { yes: () => info(records), no: _ => _ }
  await interact('Do you want to see the records?', choiceCbs)

  choiceCbs = { yes: _ => true, no: _ => false }
  const process = await interact('Do you really want to PROCESS the records?', choiceCbs)
  for (let i = 0; process && i < records.length; i++) {
    await processRecord(records[i])
    updateProgressBar(i + 1, records.length)
  }

  info('\n Script Execution Done!')
  choiceCbs = { yes: () => info(records), no: _ => _ }
  await interact('Do you want to see the processed records?', choiceCbs)
  stop()
}

start()
