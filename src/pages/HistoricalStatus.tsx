import { useEffect, useState } from "react";

import { DownloadOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { remult } from "remult";
import { SystemStatusSnapshot } from "../shared/systemStatus";
import { SystemSettings } from "../shared/systemSettings";
import { saveAs } from "file-saver";

import {Table,
Checkbox,
Button,
Select,
DatePicker,
Space,
Spin,
message,
} from "antd";
import { DateTime } from "luxon";
import { DateTimeUtils } from "../server/utilities/DateTimeUtils";
import { useSettingsContext } from "../hooks/SettingsContext";

Chart.register(...registerables);

type ValueOption = {
key: string;
label: string;
};

const defaultTimeRange = { unit: "hours", value: 24 };

export default function HistoricalStatusPage() {
const [loading, setLoading] = useState(false);
const [snapshots, setSnapshots] = useState<SystemStatusSnapshot[]>([]);
const [sensorNames, setSensorNames] = useState<string[]>([]);
const [weatherOptions, setWeatherOptions] = useState<ValueOption[]>([]);
const [selectedValues, setSelectedValues] = useState<string[]>([]);
const [timeRange, setTimeRange] = useState(defaultTimeRange);
const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
const [weatherService, setWeatherService] = useState<string | undefined>();

const systemSettings = useSettingsContext();

// Load selectedValues from localStorage on mount
useEffect(() => {
    const storedValues = localStorage.getItem("historicalStatus.selectedValues");
    const storedTimeRange = localStorage.getItem("historicalStatus.timeRange");
    if (storedTimeRange) {
        try {
            const parsed = JSON.parse(storedTimeRange);
            if (parsed && typeof parsed.value === "number" && typeof parsed.unit === "string") {
                setTimeRange(parsed);
            }
        } catch {}
    }
    if (storedValues) {
        try {
            const parsed = JSON.parse(storedValues);
            if (Array.isArray(parsed)) setSelectedValues(parsed);
        } catch {}
    }
}, []);

// Fetch settings to get current weather service
useEffect(() => {
    remult.repo(SystemSettings)
        .findFirst()
        .then((settings) => {
            setWeatherService(settings?.weatherService);
        });
}, []);

// Fetch snapshots
useEffect(() => {
    setLoading(true);
    let from: Date;
    let to: Date;
    const tz = systemSettings.timezone || "local";
    if (customRange) {
        from = DateTime.fromJSDate(customRange[0].toDate(), { zone: tz }).toJSDate();
        to = DateTime.fromJSDate(customRange[1].toDate(), { zone: tz }).toJSDate();
    } else {
        to = DateTime.now().setZone(tz).toJSDate();
        from = DateTime.now().setZone(tz).minus({ [timeRange.unit]: timeRange.value }).toJSDate();
    }
    console.log("Fetching snapshots from", from, "to", to);
    remult.repo(SystemStatusSnapshot)
        .find({
            where: {
                timestamp: {
                    $gte: DateTimeUtils.toISODateTime(from, systemSettings.timezone) ?? "",
                    $lte: DateTimeUtils.toISODateTime(to, systemSettings.timezone) ?? ""
                },
            },
            orderBy: { timestamp: "asc" },
        })
        .then((data) => {
            setSnapshots(data);
            // Collect all sensor names
            const sensors = new Set<string>();
            data.forEach((snap: SystemStatusSnapshot) => {
                Object.keys(snap.systemStatus?.sensorData || {}).forEach((name) => sensors.add(name));
            });
            setSensorNames(Array.from(sensors));
            setWeatherOptions([
                { key: "weather.temperature", label: "Temperature" },
                { key: "weather.high", label: "High Temperature" },
                { key: "weather.low", label: "Low Temperature" },
                { key: "weather.condition", label: "Weather Condition" },
            ]);
        })
        .catch(() => message.error("Failed to fetch history"))
        .finally(() => setLoading(false));
}, [timeRange, customRange]);

// Build value options
const valueOptions: ValueOption[] = [
    ...sensorNames.map((name) => ({
        key: `sensor.${name}`,
        label: `Sensor: ${name}`,
    })),
    ...weatherOptions,
];

// Prepare chart data
const chartData = {
    labels: snapshots.map((s) => DateTimeUtils.isoToDateTimeShortStr(s.timestamp, systemSettings.timezone)),
    datasets: selectedValues
        .filter((key) => key !== "weather.condition")
        .map((key, idx) => {
            let label = valueOptions.find((v) => v.key === key)?.label || key;
            let data = snapshots.map((snap) => {
                if (key.startsWith("sensor.")) {
                    return snap.systemStatus?.sensorData[key.replace("sensor.", "")]?.convertedValue ?? null;
                }
                if (key === "weather.temperature") return snap.systemStatus?.weatherData.current.temperature ?? null;
                if (key === "weather.high") return snap.systemStatus?.weatherData?.forecast.today.temperatureHigh ?? null;
                if (key === "weather.low") return snap.systemStatus?.weatherData?.forecast.today.temperatureLow ?? null;
                return null;
            });
            return {
                label,
                data,
                borderColor: `hsl(${(idx * 60) % 360},70%,50%)`,
                backgroundColor: `hsla(${(idx * 60) % 360},70%,50%,0.2)`,
                spanGaps: true,
            };
        }),
};

// Prepare table columns
const columns = [
    {
        title: "Time",
        dataIndex: "createdAt",
        render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
        fixed: "left" as const,
    },
    ...selectedValues.map((key) => {
        let label = valueOptions.find((v) => v.key === key)?.label || key;
        return {
            title: label,
            dataIndex: key,
            render: (v: any) => v ?? "-",
        };
    }),
];

// Prepare table data
const tableData = snapshots.map((snap) => {
    const row: any = { key: snap.id, createdAt: snap.timestamp };
    selectedValues.forEach((key) => {
        if (key.startsWith("sensor.")) {
            const sensorName = key.replace("sensor.", "");
            const sensorData = snap.systemStatus?.sensorData[sensorName];
            row[key] = sensorData
                ? sensorData.convertedValue !== undefined && sensorData.unit
                    ? `${Number(sensorData.convertedValue).toFixed(2)}${sensorData.unit}`
                    : sensorData.convertedValue !== undefined
                        ? Number(sensorData.convertedValue).toFixed(2)
                        : undefined
                : undefined;
        } else if (key === "weather.temperature") {
            row[key] = snap.systemStatus?.weatherData?.current?.temperature;
        } else if (key === "weather.high") {
            row[key] = snap.systemStatus?.weatherData?.forecast?.today?.temperatureHigh;
        } else if (key === "weather.low") {
            row[key] = snap.systemStatus?.weatherData?.forecast?.today?.temperatureLow;
        } else if (key === "weather.condition") {
            row[key] =
            snap.systemStatus?.weatherData?.service === weatherService
                ? snap.systemStatus?.weatherData?.current?.conditionText
                : undefined;
        }
    });
    return row;
});

// Export to CSV
const exportCSV = () => {
    const headers = ["Time", ...selectedValues.map((key) => valueOptions.find((v) => v.key === key)?.label || key)];
    const rows = tableData.map((row) =>
        [dayjs(row.createdAt).format("YYYY-MM-DD HH:mm"), ...selectedValues.map((key) => row[key] ?? "")].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    saveAs(blob, "history.csv");
};

return (
    <div style={{ padding: 24 }}>
        <h2>History Snapshots</h2>
        <Space style={{ marginBottom: 16 }} wrap>
            <span>Select values:</span>
            <Checkbox.Group
            options={valueOptions.map((v) => ({ label: v.label, value: v.key }))}
            value={selectedValues}
            onChange={(vals) => {
                setSelectedValues(vals as string[]);
                localStorage.setItem("historicalStatus.selectedValues", JSON.stringify(vals));
            }}
            />
            <Button
            onClick={() => {
                setSelectedValues([]);
                localStorage.removeItem("historicalStatus.selectedValues");
            }}
            >
            Reset Selection
            </Button>
        </Space>
        <Space style={{ marginBottom: 16 }} wrap>
            <span>Show last</span>
            <Select
            value={timeRange.value}
            style={{ width: 80 }}
            onChange={(v) => {
                setTimeRange((tr) => {
                const newRange = { ...tr, value: v };
                localStorage.setItem("historicalStatus.timeRange", JSON.stringify(newRange));
                return newRange;
                });
            }}
            options={[1, 6, 12, 24, 48, 72].map((v) => ({ value: v, label: v }))}
            />
            <Select
            value={timeRange.unit}
            style={{ width: 100 }}
            onChange={(v) => {
                setTimeRange((tr) => {
                const newRange = { ...tr, unit: v };
                localStorage.setItem("historicalStatus.timeRange", JSON.stringify(newRange));
                return newRange;
                });
            }}
            options={[
                { value: "hours", label: "Hours" },
                { value: "days", label: "Days" },
            ]}
            />
            <span>or custom range:</span>
            <DatePicker.RangePicker
            showTime
            value={customRange}
            onChange={(v) => {
                setCustomRange(v as [Dayjs, Dayjs] | null);
                if (v && v[0] && v[1]) {
                localStorage.setItem(
                    "historicalStatus.customRange",
                    JSON.stringify([v[0].toISOString(), v[1].toISOString()])
                );
                } else {
                localStorage.removeItem("historicalStatus.customRange");
                }
            }}
            />
            <Button
            onClick={() => {
                setCustomRange(null);
                localStorage.removeItem("historicalStatus.customRange");
            }}
            >
            Reset Range
            </Button>
            <Button
            icon={<DownloadOutlined />}
            onClick={exportCSV}
            disabled={tableData.length === 0}
            >
            Export CSV
            </Button>
        </Space>
        {loading ? (
            <Spin />
        ) : (
            <>
                {selectedValues.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                        <Line
                            data={chartData}
                            options={{
                                responsive: true,
                                plugins: {
                                    legend: { position: "top" as const },
                                },
                                interaction: { mode: "nearest", intersect: false },
                                scales: {
                                    x: { title: { display: true, text: "Time" } },
                                    y: { title: { display: true, text: "Value" } },
                                },
                            }}
                        />
                    </div>
                )}
                <Table
                    columns={columns}
                    dataSource={tableData}
                    size="small"
                    scroll={{ x: true }}
                    pagination={{ pageSize: 20 }}
                />
            </>
        )}
    </div>
);
}