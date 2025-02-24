import React, {
  forwardRef,
  ReactNode,
  useState,
  useImperativeHandle,
  useMemo,
  useEffect,
  useRef,
} from 'react'
import { NativeProps, withNativeProps } from '../../utils/native-props'
import dayjs from 'dayjs'
import classNames from 'classnames'
import Swiper from '../swiper'
import { mergeProps } from '../../utils/with-default-props'
import { ArrowLeft } from './arrow-left'
import { ArrowLeftDouble } from './arrow-left-double'
import { useConfig } from '../config-provider'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useUpdateEffect } from 'ahooks'
import { usePropsValue } from '../../utils/use-props-value'
import {
  convertValueToRange,
  convertPageToDayjs,
  DateRange,
  Page,
} from './convert'
import swiper from '../swiper'

dayjs.extend(isoWeek)

const classPrefix = 'adm-calendar'

export type CalendarRef = {
  jumpTo: (page: Page | ((page: Page) => Page)) => void
  jumpToToday: () => void
}

export type CalendarProps = {
  prevWeekButton?: React.ReactNode
  prevMonthButton?: React.ReactNode
  prevYearButton?: React.ReactNode
  nextWeekButton?: React.ReactNode
  nextMonthButton?: React.ReactNode
  nextYearButton?: React.ReactNode
  onPageChange?: (year: number, month: number) => void
  weekStartsOn?: 'Monday' | 'Sunday'
  renderLabel?: (date: Date) => React.ReactNode
  allowClear?: boolean
  max?: Date
  min?: Date
  shouldDisableDate?: (date: Date) => boolean
  minPage?: Page
  maxPage?: Page
  weekModel?: boolean
} & (
  | {
      selectionMode?: undefined
      value?: undefined
      defaultValue?: undefined
      onChange?: undefined
    }
  | {
      selectionMode: 'single'
      value?: Date | null
      defaultValue?: Date | null
      onChange?: (val: Date | null) => void
    }
  | {
      selectionMode: 'range'
      value?: [Date, Date] | null
      defaultValue?: [Date, Date] | null
      onChange?: (val: [Date, Date] | null) => void
    }
) &
  NativeProps

const defaultProps = {
  weekStartsOn: 'Sunday',
  defaultValue: null,
  allowClear: true,
  weekModel: false,
  prevMonthButton: <ArrowLeft />,
  prevWeekButton: <ArrowLeft />,
  prevYearButton: <ArrowLeftDouble />,
  nextMonthButton: <ArrowLeft />,
  nextWeekButton: <ArrowLeft />,
  nextYearButton: <ArrowLeftDouble />,
}

export const Calendar = forwardRef<CalendarRef, CalendarProps>((p, ref) => {
  const today = dayjs()
  const props = mergeProps(defaultProps, p)
  const { locale } = useConfig()
  const markItems = [...locale.Calendar.markItems]
  const swiperRef = useRef(null)
  const swiperPreIndexRef = useRef(null)
  const type = props.weekModel ? 'week' : 'month'

  if (props.weekStartsOn === 'Sunday') {
    const item = markItems.pop()
    if (item) markItems.unshift(item)
  }

  const [dateRange, setDateRange] = usePropsValue<DateRange>({
    value:
      props.value === undefined
        ? undefined
        : convertValueToRange(props.selectionMode, props.value),
    defaultValue: convertValueToRange(props.selectionMode, props.defaultValue),
    onChange: v => {
      if (props.selectionMode === 'single') {
        props.onChange?.(v ? v[0] : null)
      } else if (props.selectionMode === 'range') {
        props.onChange?.(v)
      }
    },
  })

  const [intermediate, setIntermediate] = useState(false)

  const [current, setCurrent] = useState(() =>
    props.weekModel
      ? dayjs(dateRange ? dateRange[1] : today)
      : dayjs(dateRange ? dateRange[0] : today).date(1)
  )

  useEffect(() => {
    return () => {}
  }, [current])

  useUpdateEffect(() => {
    props.onPageChange?.(current.year(), current.month() + 1)
  }, [current])

  useEffect(() => {
    setCurrent(
      props.weekModel
        ? dayjs(dateRange ? dateRange[1] : today)
        : dayjs(dateRange ? dateRange[0] : today).date(1)
    )
  }, [props.weekModel])

  useImperativeHandle(ref, () => ({
    jumpTo: pageOrPageGenerator => {
      let page: Page
      if (typeof pageOrPageGenerator === 'function') {
        page = pageOrPageGenerator({
          year: current.year(),
          month: current.month() + 1,
        })
      } else {
        page = pageOrPageGenerator
      }
      setCurrent(convertPageToDayjs(page))
    },
    jumpToToday: () => {
      setCurrent(dayjs().date(1))
    },
  }))

  const handlePageChange = (
    action: 'subtract' | 'add',
    num: number,
    type: 'month' | 'year' | 'week',
    index
  ) => {
    const nxtCurrent = current[action](num, type)
    if (action === 'subtract' && props.minPage) {
      const minPage = convertPageToDayjs(props.minPage)
      if (nxtCurrent.isBefore(minPage, type)) {
        return
      }
    }
    if (action === 'add' && props.maxPage) {
      const maxPage = convertPageToDayjs(props.maxPage)
      if (nxtCurrent.isAfter(maxPage, type)) {
        return
      }
    }
    setCurrent(current[action](num, type))
    document.querySelector(
      '.adm-swiper-track-inner'
    ).style.transform = `translate3d(${(index - 1) * 100}%, 0,0)`
  }

  const header = (
    <div className={`${classPrefix}-header`}>
      <a
        className={`${classPrefix}-arrow-button ${classPrefix}-arrow-button-year`}
        onClick={() => {
          handlePageChange('subtract', 1, 'year')
        }}
      >
        {props.prevYearButton}
      </a>
      <a
        className={`${classPrefix}-arrow-button ${classPrefix}-arrow-button-month`}
        onClick={() => {
          handlePageChange('subtract', 1, 'month')
        }}
      >
        {props.prevMonthButton}
      </a>
      <a
        className={`${classPrefix}-arrow-button ${classPrefix}-arrow-button-month`}
        onClick={() => {
          handlePageChange('subtract', 1, 'week')
        }}
      >
        {props.prevWeekButton}
      </a>
      <div className={`${classPrefix}-title`}>
        {locale.Calendar.renderYearAndMonth(
          current.year(),
          current.month() + 1
        )}
      </div>
      <a
        className={classNames(
          `${classPrefix}-arrow-button`,
          `${classPrefix}-arrow-button-right`,
          `${classPrefix}-arrow-button-right-month`
        )}
        onClick={() => {
          handlePageChange('add', 1, 'week')
        }}
      >
        {props.nextWeekButton}
      </a>
      <a
        className={classNames(
          `${classPrefix}-arrow-button`,
          `${classPrefix}-arrow-button-right`,
          `${classPrefix}-arrow-button-right-month`
        )}
        onClick={() => {
          handlePageChange('add', 1, 'month')
        }}
      >
        {props.nextMonthButton}
      </a>
      <a
        className={classNames(
          `${classPrefix}-arrow-button`,
          `${classPrefix}-arrow-button-right`,
          `${classPrefix}-arrow-button-right-year`
        )}
        onClick={() => {
          handlePageChange('add', 1, 'year')
        }}
      >
        {props.nextYearButton}
      </a>
    </div>
  )

  const maxDay = useMemo(() => props.max && dayjs(props.max), [props.max])
  const minDay = useMemo(() => props.min && dayjs(props.min), [props.min])

  function renderCells(current) {
    const cells: ReactNode[] = []
    let iterator = current.subtract(current.isoWeekday(), 'day')
    const totalityDays = props.weekModel ? 7 : 6 * 7

    if (props.weekStartsOn === 'Monday') {
      iterator = iterator.add(1, 'day')
    }
    while (cells.length < totalityDays) {
      const d = iterator
      let isSelect = false
      let isBegin = false
      let isEnd = false
      if (dateRange) {
        const [begin, end] = dateRange
        isBegin = d.isSame(begin, 'day')
        isEnd = d.isSame(end, 'day')
        isSelect =
          isBegin ||
          isEnd ||
          (d.isAfter(begin, 'day') && d.isBefore(end, 'day'))
      }
      const inThisMonth = d.month() === current.month()
      const disabled = props.shouldDisableDate
        ? props.shouldDisableDate(d.toDate())
        : (maxDay && d.isAfter(maxDay, 'day')) ||
          (minDay && d.isBefore(minDay, 'day'))
      cells.push(
        <div
          key={d.valueOf()}
          className={classNames(
            `${classPrefix}-cell`,
            (disabled || !inThisMonth) && `${classPrefix}-cell-disabled`,
            inThisMonth && {
              [`${classPrefix}-cell-today`]: d.isSame(today, 'day'),
              [`${classPrefix}-cell-selected`]: isSelect,
              [`${classPrefix}-cell-selected-begin`]: isBegin,
              [`${classPrefix}-cell-selected-end`]: isEnd,
            }
          )}
          onClick={() => {
            if (!props.selectionMode) return
            if (disabled) return
            const date = d.toDate()
            if (!inThisMonth) {
              setCurrent(d.clone().date(1))
            }
            function shouldClear() {
              if (!props.allowClear) return false
              if (!dateRange) return false
              const [begin, end] = dateRange
              return d.isSame(begin, 'date') && d.isSame(end, 'day')
            }
            if (props.selectionMode === 'single') {
              if (props.allowClear && shouldClear()) {
                setDateRange(null)
                return
              }
              setDateRange([date, date])
            } else if (props.selectionMode === 'range') {
              if (!dateRange) {
                setDateRange([date, date])
                setIntermediate(true)
                return
              }
              if (shouldClear()) {
                setDateRange(null)
                setIntermediate(false)
                return
              }
              if (intermediate) {
                const another = dateRange[0]
                setDateRange(another > date ? [date, another] : [another, date])
                setIntermediate(false)
              } else {
                setDateRange([date, date])
                setIntermediate(true)
              }
            }
          }}
        >
          <div className={`${classPrefix}-cell-top`}>{d.date()}</div>
          <div className={`${classPrefix}-cell-bottom`}>
            {props.renderLabel?.(d.toDate())}
          </div>
        </div>
      )
      iterator = iterator.add(1, 'day')
    }
    return cells
  }

  const body = (
    <Swiper
      defaultIndex={1}
      ref={swiperRef}
      loop
      indicator={() => null}
      onIndexChange={index => {
        if (swiperPreIndexRef.current === null) {
          swiperPreIndexRef.current = index
        } else {
          if (swiperPreIndexRef.current === 2 && index === 0) {
            handlePageChange('add', 1, type, index)
          } else if (swiperPreIndexRef.current === 0 && index === 2) {
            handlePageChange('subtract', 1, type, index)
          } else if (swiperPreIndexRef.current > index) {
            handlePageChange('subtract', 1, type, index)
          } else {
            handlePageChange('add', 1, type, index)
          }
          swiperPreIndexRef.current = index
          return
        }
      }}
    >
      <Swiper.Item>
        <div className={`${classPrefix}-cells`}>
          {renderCells(current.subtract(1, type))}
        </div>
      </Swiper.Item>

      <Swiper.Item>
        <div className={`${classPrefix}-cells`}>{renderCells(current)}</div>
      </Swiper.Item>
      <Swiper.Item>
        <div className={`${classPrefix}-cells`}>
          {renderCells(current.add(1, type))}
        </div>
      </Swiper.Item>
    </Swiper>
  )

  const mark = (
    <div className={`${classPrefix}-mark`}>
      {markItems.map((item, index) => (
        <div key={index} className={`${classPrefix}-mark-cell`}>
          {item}
        </div>
      ))}
    </div>
  )

  return withNativeProps(
    props,
    <div className={classPrefix}>
      {header}
      {mark}
      {body}
    </div>
  )
})
