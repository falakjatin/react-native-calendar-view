import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, VirtualizedList, Text } from 'react-native'

import { format, isEqual, parse } from 'date-fns';
import { useSharedValue } from 'react-native-reanimated';

import WeeklyCalendar from '../../component/weekly-calendar';

import Utils from '../../utils'
import staticData from './static-data';
import styles from './styles'
import { InnerListData, ListData, OnScrollToIndexFailed, OnViewableItemsChanged } from './types';

let onViewableItemsChangedFlag: 'dayPressed' | 'scrollStart' | 'scrollEnd' = 'scrollEnd'

const CalendarListScreen = () => {

    const listRef = useRef<VirtualizedList<string>>(null)
    const timeoutIdRef = useRef<number | null>(null)

    const selectedAnim = useSharedValue(0);

    const [list, setList] = useState<ListData>({})
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [apiCall, setApiCall] = useState<boolean>(false)

    useEffect(() => {
        getListData(selectedDate)
    }, [])

    const getListData = async (date: Date) => {
        setApiCall(true)
        const response = await fakeApiCall(date)
        setList(response)
        const index = Object.keys(response).findIndex(a => isEqual(parse(a, 'dd MMMM yyyy', new Date()), selectedDate))
        setTimeout(() => {
            listRef.current?.scrollToIndex({ index: index === -1 ? 0 : index })
        }, 600);
        setApiCall(false)
        // api call here
    }

    const onCalendarDayPress = async ({ date, event }: { date: Date, event: 'weekChange' | 'dateChange' }) => {
        onViewableItemsChangedFlag = 'dayPressed'
        setSelectedDate(date)
        if (event === 'weekChange') { await getListData(date) }
        let index = Object.keys(list).findIndex(a => a === format(date, 'dd MMMM yyyy'))
        setTimeout(() => {
            listRef.current?.scrollToIndex({ index: index === -1 ? 0 : index })
        }, 400);
    }

    const scrollToIndexFailed = (error: OnScrollToIndexFailed) => {
        const offset = error.averageItemLength * error.index;
        listRef.current?.scrollToOffset({ offset });
        setTimeout(() => listRef.current?.scrollToIndex({ index: error.index }), 100);
    }

    const onViewableItemsChanged = useCallback(({ viewableItems, changed }: OnViewableItemsChanged) => {
        timeoutIdRef.current && clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = setTimeout(() => {
            if (onViewableItemsChangedFlag && onViewableItemsChangedFlag !== 'dayPressed') {
                if (viewableItems && viewableItems[0] && viewableItems[0].key && changed && changed.length > 0) {
                    const date = parse(viewableItems[0].key, 'dd MMMM yyyy', new Date())
                    setSelectedDate(date)
                }
            }
        }, 1300);
    }, []);

    const renderLogList = ({ item }: { item: keyof typeof list }) => {
        return (
            <View style={[styles.shadow, styles.logListContainer]}>
                <Text style={styles.logHeader}>{item}</Text>
                {
                    list[item].length ?
                        list[item].map(renderLog) :
                        <View style={styles.logContainer}>
                            <Text style={styles.noData}>{!apiCall ? 'No data found.' : ''}</Text>
                        </View>
                }
            </View>
        )
    }

    const renderLog = (item: InnerListData) => {
        return (
            <View
                key={item.id}
                style={styles.logContainer}>
                <Text style={styles.labelText}>{item.label}</Text>
                <Text style={styles.descText} numberOfLines={1} ellipsizeMode="tail">{item.desc}</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <View style={[styles.shadow, styles.calendarContainer]}>
                <WeeklyCalendar
                    selectedAnim={selectedAnim}
                    onCalendarDayPress={onCalendarDayPress}
                    selectedDate={selectedDate} />
            </View>
            <VirtualizedList
                style={styles.list}
                onScrollBeginDrag={() => {
                    onViewableItemsChangedFlag = 'scrollStart'
                }}
                onMomentumScrollEnd={() => {
                    if (onViewableItemsChangedFlag !== 'dayPressed') {
                        onViewableItemsChangedFlag = 'scrollEnd'
                    }
                }}
                ref={listRef}
                getItem={(data, index) => (data[index])}
                getItemCount={(data) => data && data.length ? data.length : 0}
                data={Object.keys(list)}
                keyExtractor={(item: string) => item}
                renderItem={renderLogList}
                onViewableItemsChanged={onViewableItemsChanged}
                onScrollToIndexFailed={scrollToIndexFailed}
                viewabilityConfig={{
                    itemVisiblePercentThreshold: 70,
                    waitForInteraction: true,
                    minimumViewTime: 100,
                }} />
            <View style={styles.belt} />
            <View style={[styles.belt, styles.secondBelt]} />
        </View>
    )
}

export default CalendarListScreen;

const fakeApiCall = (date: Date): Promise<ListData> => {
    return new Promise((resolve) => {
        const data: ListData = {}
        Utils.countWeekDays(date).forEach((a, i) => data[format(a, 'dd MMMM yyyy')] = staticData.data[i])
        resolve(data)
    })
}
