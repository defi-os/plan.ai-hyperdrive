import React, { useState, useEffect, useMemo } from "react";
import { QuestionMarkCircleIcon, SparklesIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@/components/icons/star";
import { ForkIcon } from "@/components/icons/fork-icon";
import EmptyList from "@/components/icons/EmptyList";

import Uploader from "@/components/ui/forms/uploader";
import Input from "@/components/ui/forms/input";
import Textarea from "@/components/ui/forms/textarea";
import Image from "next/image";
import Spinner from "@/components/custom/spinner";
import cn from "classnames";
import Button from "@/components/ui/button/ButtonNew";

import GithubBtn from "@/components/SignInBtns/Github";
import JiraBtn from "@/components/SignInBtns/Jira";

import axios from "@/lib/axiosClient";
import { useAppDispatch, useAppSelector } from "@/store/store";
// import { setStep1Data } from "@/store/newCreationSlice";
import { useSession } from "next-auth/react";

interface RepoItemProps {
    repo: any;
    selectedRepo: any;
    setSelect: React.Dispatch<React.SetStateAction<any>>;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    setChooseRepo: React.Dispatch<React.SetStateAction<boolean>>;
}

const RepoItem: React.FC<RepoItemProps> = ({ repo, selectedRepo, setSelect, setSearch, setChooseRepo }) => {
    const { full_name, forks, stargazers_count } = repo;
    return (
        <div
            className={cn("w-full cursor-pointer text-gray-300 hover:text-white", {
                "!text-primary hover:!text-primary": repo?.id === selectedRepo?.id,
            })}
            onClick={(e) => {
                e.stopPropagation();
                setSelect(repo);
                setChooseRepo(false);
                setSearch(repo.full_name);
            }}>
            <div className="my-1 flex w-full items-center justify-between">
                <div className="text-3xs xl:text-2xs 3xl:text-xs">{full_name}</div>
                <div className="flex flex-col gap-2 text-2xs xl:text-xs 3xl:text-sm">
                    <div className="flex items-center gap-2">
                        <div className="pl-1">{stargazers_count > 1000 ? Math.round(stargazers_count * 100) / 100 + "K" : stargazers_count}</div>
                        <StarIcon />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="pl-1">{forks > 1000 ? Math.round(forks * 100) / 100 + "K" : forks}</div>
                        <ForkIcon />
                    </div>
                </div>
            </div>
            <div className="h-0.5 w-full lineGradientHorizontalGray"></div>
        </div>
    );
};

interface IssueItemProps {
    item: any;
    selectedIssue: any;
    setSelectedIssue: React.Dispatch<React.SetStateAction<any>>;
    setChooseIssue: React.Dispatch<React.SetStateAction<boolean>>;
    setIssueSearch: React.Dispatch<React.SetStateAction<string>>;
}

const IssueItem: React.FC<IssueItemProps> = ({ item, selectedIssue, setSelectedIssue, setChooseIssue, setIssueSearch }) => {
    return (
        <div
            className={cn("w-full cursor-pointer text-gray-300 hover:text-white", {
                "!text-primary hover:!text-primary": selectedIssue?.id === item?.id,
            })}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedIssue(item);
                setIssueSearch(item.title);
                setChooseIssue(false);
            }}>
            <div className="my-1 flex w-full items-center justify-between">
                <div className="text-3xs xl:text-2xs 3xl:text-xs">
                    {item?.title}
                    {" #"}
                    {item?.number}
                </div>
                <div className="flex flex-col gap-2 text-2xs xl:text-xs 3xl:text-sm">
                    <div className="flex items-center gap-2">
                        <div className="pl-1">{item?.comments}</div>
                        <ChatBubbleLeftIcon className="h-4 w-4" />
                    </div>
                </div>
            </div>
            <div className={"lineGradientHorizontalGray h-0.5 w-full"}></div>
        </div>
    );
};

interface Step1Props {
    setStep: React.Dispatch<React.SetStateAction<number>>;
}

export const Step1: React.FC<Step1Props> = ({ setStep }) => {
    const { data: session } = useSession();
    const dispatch = useAppDispatch();
    // const step1Data = useAppSelector((state) => state.newCreation.step1);

    const [search, setSearch] = useState("");
    const [selectedRepo, setSelectedRepo] = useState<any>();

    const [chooseRepo, setChooseRepo] = useState(false);
    const [repos, setRepos] = useState<any>([]);
    const [isRepoLoading, setIsRepoLoading] = useState(false);

    const [issueSearch, setIssueSearch] = useState("");
    const [chooseIssue, setChooseIssue] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<any>();
    const [isIssueLoading, setIsIssueLoading] = useState(false);

    const [additionalComments, setAdditionalComments] = useState("");

    const [repoIssues, setRepoIssues] = useState<any>([]);

    const [nextError, setNextError] = useState("");

    const fetchRepos = async () => {
        let keepGoing = true;
        let pagination = 1;
        let _repos: any = [];
        setIsRepoLoading(true);
        while (keepGoing) {
            const res = await axios
                .get(`https://api.github.com/user/repos?sort=pushed&per_page=100&page=${pagination}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${(session as any)?.accessToken}`,
                        Accept: "application/vnd.github.v3+json",
                    },
                })
                .then((res) => res.data)
                .catch((err) => console.log(err));

            //filter conditions added
            // 1) admin controls
            // 2) if not a fork (as cant create issues on forked repos)
            // 3) existing project on defios

            const refinedRes = res.filter((repo: any) => repo.permissions.admin && !repo.fork);

            if (refinedRes.length === 0) {
                keepGoing = false;
            } else {
                _repos = [..._repos, ...refinedRes];
                setRepos(_repos);
                setIsRepoLoading(false);
                pagination++;
            }
        }
    };

    const repoSearch = useMemo(() => {
        if (search === "") return repos;
        const filteredRepos = repos.filter((_repo: any) => {
            return _repo.full_name.toLowerCase().includes(search.toLowerCase());
        });
        return filteredRepos;
    }, [search, repos, selectedRepo]);

    const getIssues = async () => {
        if (!selectedRepo?.html_url) return;
        setIsIssueLoading(true);
        axios
            .get(selectedRepo.html_url.replace("https://github.com/", "https://api.github.com/repos/") + "/issues", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${(session as any)?.accessToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
            })
            .then((res) => {
                const filteredIssues = res.data.filter((item: any) => {
                    return !Object.keys(item).includes("pull_request");
                });
                setRepoIssues(filteredIssues);
            })
            .catch((err) => console.log(err))
            .finally(() => setIsIssueLoading(false));
    };

    const IssuesSearch = useMemo(() => {
        if (issueSearch === "") return repoIssues;
        const filteredIssues = repoIssues.filter((_issue: any) => {
            return _issue.title.toLowerCase().includes(issueSearch.toLocaleLowerCase());
        });
        return filteredIssues;
    }, [issueSearch, repoIssues]);

    useEffect(() => {
        if (session && (session as any)?.accessToken && repos.length === 0) {
            fetchRepos();

            // setSearch(step1Data.repoName);
            // setSelectedRepo(step1Data.selectedRepo);
        }
    }, [session]);

    useEffect(() => {
        if (
            session &&
            (session as any)?.accessToken &&
            selectedRepo !== null &&
            selectedRepo !== undefined &&
            selectedRepo.html_url !== "" &&
            selectedRepo.html_url !== null &&
            selectedRepo.html_url !== undefined
        ) {
            getIssues();

            // setSearch(step1Data.repoName);
            // setSelectedRepo(step1Data.selectedRepo);
        }
    }, [session, selectedRepo]);

    const handleSubmit = () => {};

    return (
        <div
            className="absolute z-[40] flex h-full w-full flex-col gap-10 rounded-xl bg-black p-8 text-sm xl:text-base 3xl:text-lg"
            onClick={() => {
                setChooseRepo(false);
                if (selectedRepo !== null && selectedRepo !== undefined) {
                    setSearch(selectedRepo.full_name);
                }
                setChooseIssue(false);
                if (selectedIssue !== undefined || selectedIssue !== null) {
                    setIssueSearch(selectedIssue?.title || "");
                }
            }}>
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 uppercase ">
                    <div>Connected Applications</div>
                    <QuestionMarkCircleIcon className="h-5 w-5 " />
                </div>
                <div className="flex items-center gap-4">
                    <GithubBtn />
                    <JiraBtn />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 3xl:text-base xl:text-sm text-xs uppercase ">
                    <div>Choose Repository</div>
                    <QuestionMarkCircleIcon className="h-5 w-5 " />
                </div>
                <div className="relative">
                    <Input
                        placeholder="type the name of your repository and choose it from the list"
                        searchLeft={true}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        inputClassName="text-2xs xl:text-xs 3xl:text-sm"
                        className="absolute"
                        onClick={(e) => {
                            e.stopPropagation();
                            setChooseRepo(true);
                        }}
                    />
                    <div
                        className={`gradient-border-box-bottom absolute z-[40] h-[24rem] w-full flex-col gap-2 overflow-y-auto rounded-b-xl border-b bg-light-gray px-6 py-2 drop-shadow-xl xl:h-[29.5rem] ${
                            chooseRepo ? "flex" : "hidden"
                        }`}>
                        {!isRepoLoading &&
                            repoSearch.length !== 0 &&
                            repoSearch.map((item: any, idx: number) => (
                                <RepoItem key={idx} repo={item} selectedRepo={selectedRepo} setSelect={setSelectedRepo} setSearch={setSearch} setChooseRepo={setChooseRepo} />
                            ))}
                        {!isRepoLoading && repoSearch.length === 0 && (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                                <EmptyList />
                                <div className="text-lg text-gray-500">No Repos Available</div>
                            </div>
                        )}
                        {isRepoLoading && (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                                <Spinner />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 3xl:text-base xl:text-sm text-xs uppercase ">
                    <div>Choose an Issue</div>
                    <QuestionMarkCircleIcon className="h-5 w-5 " />
                </div>
                <div className="relative">
                    <Input
                        placeholder="type the name of your issue and choose it from the list"
                        searchLeft={true}
                        value={issueSearch}
                        onChange={(e) => {
                            setIssueSearch(e.target.value);
                        }}
                        inputClassName="text-2xs xl:text-xs 3xl:text-sm"
                        className="absolute"
                        onClick={(e) => {
                            e.stopPropagation();
                            setChooseIssue(true);
                        }}
                    />
                    <div
                        className={`gradient-border-box-bottom absolute z-[40] h-[24rem] w-full flex-col gap-2 overflow-y-auto rounded-b-xl border-b bg-light-gray px-6 py-2 drop-shadow-xl xl:h-[29.5rem] ${
                            chooseIssue ? "flex" : "hidden"
                        }`}>
                        {!isIssueLoading &&
                            IssuesSearch !== undefined &&
                            IssuesSearch.map((_issue: string, idx: number) => (
                                <IssueItem item={_issue} selectedIssue={selectedIssue} setIssueSearch={setIssueSearch} setSelectedIssue={setSelectedIssue} setChooseIssue={setChooseIssue} key={idx} />
                            ))}
                        {isIssueLoading && (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                                <Spinner />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2 h-full">
                <div className="flex items-center gap-3 uppercase ">
                    <div>Additional Comments</div>
                    <QuestionMarkCircleIcon className="h-5 w-5 " />
                </div>
                <Textarea
                    placeholder="add any additional comments that might help the outsourced developers understand & execute this task better. "
                    value={additionalComments}
                    onChange={(e) => setAdditionalComments(e.target.value)}
                    inputClassName="text-2xs xl:text-xs 3xl:text-sm h-full"
                />
            </div>

            <div className="mt-auto flex w-full items-center justify-between">
                <div className="normal text-xs text-red-400 xl:text-sm 3xl:text-base">{nextError}</div>
                <Button color="PrimarySolid" onClick={handleSubmit}>
                    next
                </Button>
            </div>
        </div>
    );
};

export default Step1;
