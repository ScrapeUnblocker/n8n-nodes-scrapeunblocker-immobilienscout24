import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "ImmobilienScout24 Scraper" Actor: https://apify.com/scrapeunblocker/immobilienscout24-scraper
const ACTOR_ID = 'ACoJ6KaSubLJBpPHB';
const INTEGRATION_APP_ID = 'scrapeunblocker-immobilienscout24-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	channel: {
		key: 'channel',
	},
	propertyType: {
		key: 'property_type',
	},
	minPrice: {
		key: 'min_price',
	},
	maxPrice: {
		key: 'max_price',
	},
	minRooms: {
		key: 'min_rooms',
	},
	maxRooms: {
		key: 'max_rooms',
	},
	minArea: {
		key: 'min_area',
	},
	maxArea: {
		key: 'max_area',
	},
	page: {
		key: 'page',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'listing:search': {
			input.location = requireString.call(this, 'location', 'Location', itemIndex);
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class ImmobilienScout24Scraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ImmobilienScout24 Scraper',
		name: 'immobilienScout24Scraper',
		icon: {
			light: 'file:immobilienScout24Scraper.png',
			dark: 'file:immobilienScout24Scraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search ImmobilienScout24 apartments and houses for rent or sale in Germany with the ScrapeUnblocker Actor on Apify',
		defaults: {
			name: 'ImmobilienScout24 Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Listing',
						value: 'listing',
					},
				],
				default: 'listing',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['listing'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search property listings in a German city or region',
						action: 'Search listings',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'Berlin',
				description:
					"A German city ('Berlin', 'Muenchen'), a state ('Bayern') or an ImmobilienScout24 region path ('berlin/berlin/mitte')",
				displayOptions: {
					show: {
						resource: ['listing'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 20,
				description: 'How many listings to collect across pages (20 per page, up to 500)',
				displayOptions: {
					show: {
						resource: ['listing'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Max Living Area (M²)',
						name: 'maxArea',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 100,
						description: 'Largest living area in square metres',
					},
					{
						displayName: 'Max Price (EUR)',
						name: 'maxPrice',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 1500,
						description:
							'Highest price in EUR: cold rent per month when renting, purchase price when buying',
					},
					{
						displayName: 'Max Rooms',
						name: 'maxRooms',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 4,
						description: 'Most rooms; half rooms are allowed, e.g. 3.5',
					},
					{
						displayName: 'Min Living Area (M²)',
						name: 'minArea',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'Smallest living area in square metres',
					},
					{
						displayName: 'Min Price (EUR)',
						name: 'minPrice',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Lowest price in EUR: cold rent per month when renting, purchase price when buying',
					},
					{
						displayName: 'Min Rooms',
						name: 'minRooms',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 1,
						description: 'Fewest rooms; half rooms are allowed, e.g. 2.5',
					},
					{
						displayName: 'Property Type',
						name: 'propertyType',
						type: 'options',
						options: [
							{
								name: 'Apartment',
								value: 'apartment',
							},
							{
								name: 'House',
								value: 'house',
							},
						],
						default: 'apartment',
						description: 'Apartments or houses',
					},
					{
						displayName: 'Rent or Buy',
						name: 'channel',
						type: 'options',
						options: [
							{
								name: 'Buy',
								value: 'buy',
							},
							{
								name: 'Rent',
								value: 'rent',
							},
						],
						default: 'rent',
						description: 'Whether to search listings for rent or for sale',
					},
					{
						displayName: 'Start Page',
						name: 'page',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'Results page to start from (1 is the first page)',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
