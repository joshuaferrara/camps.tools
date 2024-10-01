# CampsTools Weather Messenger

Weather Messenger interacts with Open-Meteo, AWS SES and AWS S3 to report
current weather conditions and condensed forecasts to your [Spot satellite messenger](https://www.findmespot.com)
when you need it.

![](docs/images/arch.png)

Components:

- AWS SES: Handles emails coming from and going to your device via its unique email address.
- AWS S3: Used by SES to temporarily store emails from your device, prior to being read by the lambda. These messages are encrypted at-rest and deleted after use by the Lambda.
- AWS Lambda: Parses your location from your message, fetches weather information from Open-Meteo, and then sends a reply with a forecast back to your device via SES.
- SPOT/Globalstar provides the magic to get messages to/from Weather Messenger.

## Caution!

While this service is free to use, you will incur charges on your SPOT account as
responses from Weather Messenger are considered "Custom Messages". Please see [service plans](https://www.findmespot.com/en-us/products-services/service-plans) for more details.

Please be aware: **you are responsible for any charges incurred as a result of using this service**.

## How to Use

Send any pre-defined message **with location** to your preferred email address below from your Spot device:

For imperial forecasts (Fahreinheit - mph - inches): `fcst+imp@camps.tools`

For metric forecasts (Celsius - meters/sec - millimeters): `fcst@camps.tools`

## Example Forecast

Weather forecasts are condensed as messages on the Spot network must be less than or equal to 140 characters in length. Units and short-hand column identifiers are only included in the first line of the reply. See the legend below for more details.

```
25°F RH 60% WS 5mph WG 10mph 5in
01-01 70/60 5 10 0%
01-02 65/55 5 10 0%
01-03 75/70 0 0 0%
01-04 80/70 0 0 0%
01-05 85/70 0 0 0%
```

### Legend

```
┌───────────────────────────────────── Temperature
│    ┌──────────────────────────────── Relative Humidity
│    │      ┌───────────────────────── Wind Speed
│    │      │       ┌───────────────── Wind Gust
│    │      │       │        ┌──────── Precipitation
└─── └───── └────── └─────── └──
65°F RH 60% WS 5mph WG 10mph 0in  ◄─── Current Conditions
01-01 70/60 5 10 0%               ◄─┐
01-02 65/55 5 10 0%               ◄─┤
01-03 75/70 0 0 0%                ◄─┼─ 5 day forecast
01-04 80/70 0 0 0%                ◄─┤
01-05 85/70 0 0 0%                ◄─┘
┌──── ┌──── ┌ ┌ ┌──
│     │     │ │ └───────────────────── Preciptation Probability
│     │     │ └─────────────────────── Wind Gust (max)
│     │     └───────────────────────── Wind Speed (max)
│     └─────────────────────────────── Temp Hi/Lo
└───────────────────────────────────── Date MM-DD
```
