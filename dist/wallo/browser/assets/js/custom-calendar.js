/*====================
  custom calander js
======================*/
mobiscroll.setOptions({
    locale: mobiscroll
        .localeEn,
    theme: 'ios',
    themeVariant: 'light'
});

mobiscroll.datepicker('#demo-range-selection', {
    controls: ['calendar'],
    dateFormat: 'D MMMM YYYY',
    dataTimezone: 'utc',
    displayTimezone: 'local',
    timezonePlugin: mobiscroll.momentTimezone,
    display: 'inline',
    select: 'range',
    locale: mobiscroll.localeEn,
    showRangeLabels: true,
});