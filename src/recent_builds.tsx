import { Icon, Color, List, ActionPanel, getPreferenceValues, closeMainWindow, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from "dayjs";
import open from "open";
import axios from "axios";

interface Preferences {
    pat: string;
    organization: string;
    project: string;
}

interface Href {
    href: string;
}

interface TriggerInfo {
    "ci.sourceBranch": string;
    "ci.sourceSha": string;
    "ci.message": string;
    "ci.triggerRepository": string;
}

interface Build {
    state: string;
    result: string;
    id: number;
    buildNumber: string;
    resultIcon: string;
    resultColor: string;
    _links: { [key: string]: Href };
    link: string;
    startTime: string;
    fromNow: string;
    detail?: Run | null;
    triggerInfo?: TriggerInfo | null;
    title: string;
}

interface Run {
    id: number;
}

export default function Command () {
    const preferences: Preferences = getPreferenceValues();

    const [builds, setBuilds] = useState<Build[]>([]);
    dayjs.extend(relativeTime);

    useEffect(() => {
        async function fetchData () {

            const api = `https://dev.azure.com/${preferences.organization}/${preferences.project}/_apis/build/builds?api-version=6.0&$top=10`;
            const result = await axios.get(api, {
                auth: {
                    username: "",
                    password: preferences.pat,
                }
            }).catch(err => err);
            const builds: Build[] = [];
            result.data.value.forEach(async (build: Build) => {
                build.fromNow = dayjs(build.startTime).fromNow();
                build.title = `#${build.buildNumber} ${build.triggerInfo?.["ci.message"]}`;
                build.resultIcon = build.result === "succeeded" ? Icon.Checkmark : Icon.XmarkCircle;
                build.link = build._links.web.href;
                build.resultColor = build.result === "succeeded" ? Color.Green : Color.Red;
                builds.push(build);
            });
            setBuilds(builds);
        }
        fetchData();
    }, []);

    return (
        <List>
            {builds.map((build) => (
                <List.Item actions={
                    <ActionPanel>
                        <ActionPanel.Section>
                            <ActionPanel.Item
                                title="Open in Chrome"
                                icon="chrome-icon.png"
                                onAction={() => {
                                    open(build.link, { app: { name: open.apps.chrome } });
                                    popToRoot({ clearSearchBar: true });
                                    closeMainWindow({ clearRootSearch: true });
                                }}
                            />
                        </ActionPanel.Section>
                    </ActionPanel>
                } title={build.title} subtitle={build.fromNow} key={build.id} icon={{ source: build.resultIcon, tintColor: build.resultColor }} />
            ))}
        </List>
    );
}